const { S3 } = require('aws-sdk');
const s3 = new S3({ apiVersion: '2006-03-01' });

const UNPROCCESED_PREFIX = 'treeunits/';
const PROCESSED_PREFIX = 'units/';

//Try to get processed object from the bucket.
// If throws, it doesn't exist, so return false
async function hasProcesseded({processedKey, bucket}) {

    try {
        await s3.headObject({
            Bucket: bucket,
            Key: processedKey,
        }).promise();
        return true;
    } catch (err) {
        return false;
    }
}

//Get metaData.Metadata from unpoccessed object
// Return the data we need to send to the tree api
async function getMetaData({unproccesedKey, bucket}) {
    try {
        const metaData = await s3.headObject({
            Bucket: bucket,
            Key: unproccesedKey,
        }).promise();
        // iOS app sends metaData.Metadata
        const metaDataFromIos = metaData.Metadata;
        const id = metaDataFromIos.phimageid ? metaDataFromIos.phimageid : '';
        const dateTaken = metaDataFromIos.datetaken ? metaDataFromIos.datetaken : '';
        const latitude = metaDataFromIos.latitude ? metaDataFromIos.latitude : null;
        const longitude = metaDataFromIos.longitude ? metaDataFromIos.longitude : null;
        const species = metaDataFromIos.species || '';
        const supervisor = metaDataFromIos.supervisor || '';
        const site = metaDataFromIos.site || '';
        return {
            id,
            dateTaken,
            latitude,
            longitude,
            site,
            species,
            supervisor,
        };
    } catch (err) {
        console.log({ err });
        throw new Error(`Error getting object ${key} from bucket ${bucket}.`);
    }

}

//POST to the tree api
async function pushToTreeTracker({metaData, treeApiUrl}) {
    try {
        const res = await fetch(treeApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(metaData),
        });
        // return true if 20X status code
        return res.status >= 200 && res.status < 300;
    } catch (err) {
        console.log({ err });
        return false;

    }
}

// Put empty file with name unprocessedKey in processed folder
async function markProcssed({processedKey,bucket}) {
    try {
        const results = await s3.putObject({
            Bucket: bucket,
            Body: '',
            Key: processedKey,
        });
        console.log({results});
        return true;
    } catch (error) {
        console.log({ error });
        return false;
    }
}
exports.handler = async (event, context) => {
    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const unproccesedKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const processedKey = unproccesedKey.replace(UNPROCCESED_PREFIX, PROCESSED_PREFIX);
    const {
        treeApiUrl,
    } = process.env;
    const completed = await hasProcesseded({processedKey, bucket});
    if( completed ) {
        console.log('Already processed',{hasProcesseded, processedKey});
        return;
    }
    const metaData = await getMetaData({unproccesedKey, bucket});
    const pushed = await pushToTreeTracker({metaData, treeApiUrl});
    if( ! pushed    ) {
        throw new Error(`Error pushing object ${key} to tree api.`);
    }
    const moved = await markProcssed({processedKey,bucket});
    if( ! moved ) {
        throw new Error(`Error moving object ${key} to processed folder.`);
    }
    console.log('Done', {
        processedKey,
        unproccesedKey,
        metaData,
        moved
    })
    return;
};
