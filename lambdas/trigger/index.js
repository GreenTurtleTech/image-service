import { S3 } from 'aws-sdk';
const s3 = new S3({ apiVersion: '2006-03-01' });

const UNPROCCESED_PREFIX = 'treeuploads/';
const PROCESSED_PREFIX = 'processed/';

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
        const planted_at = metaDataFromIos.datetaken ? metaDataFromIos.datetaken : '';
        const latitude = metaDataFromIos.latitude ? metaDataFromIos.latitude : null;
        const longitude = metaDataFromIos.longitude ? metaDataFromIos.longitude : null;
        const species = metaDataFromIos.species || '';
        const supervisor = metaDataFromIos.supervisor || '';
        const site = metaDataFromIos.site || '';
        const device_id = metaDataFromIos.deviceId || '';
        return {
            id,
            planted_at,
            latitude,
            longitude,
            site,
            species,
            supervisor,
            device_id,
        };
    } catch (err) {
        console.log({ err });
        throw new Error(`Error getting object ${unproccesedKey} from bucket ${bucket}.`);
    }

}

//POST to the tree api
async function pushToTreeTracker({metaData, treeApiUrl,unproccesedKey }) {
    const res = await fetch(treeApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaData),
    }).then(r => {
        if( r.ok){
            return r.json();
        }
        try {
            r = r.json();
            console.log({r})
        } catch (error) {
            console.log(`Error pushing object ${unproccesedKey} to tree api. ${error.message}`);
        }
    }).catch(error => {
        console.log(`Error pushing object ${unproccesedKey} to tree api. ${error.message}`);
    })
    if( ! res ) {
        return false;
    }
    return  res.status >= 200 && res.status < 300;
}

// Put json file with metaData with name unprocessedKey in processed folder
async function markProcessed({processedKey,bucket,metaData}) {

    try {
        const s3PutResponse = await s3.putObject({
            Bucket: bucket,
            Body: JSON.stringify(metaData),
            Key: processedKey,
        }).promise();
        console.log({s3PutResponse})
        return true;
    } catch (error) {
        console.log({ error });
        return false;
    }
}
exports.handler = async (event, context) => {
    const {
        treeApiUrl,
        bucketName,
    } = process.env;
    const bucket = bucketName && bucketName.length ? bucketName : event.Records[0].s3.bucket.name;

    const unproccesedKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const processedKey = `${unproccesedKey.replace(UNPROCCESED_PREFIX, PROCESSED_PREFIX)}.json`;

    const completed = await hasProcesseded({processedKey, bucket});
    if( completed ) {
        console.log('Already processed',{hasProcesseded, processedKey});
        return;
    }
    console.log('Processing', {unproccesedKey, processedKey});
    const metaData = await getMetaData({unproccesedKey, bucket});
    await Promise.all([
        await pushToTreeTracker({metaData, treeApiUrl,unproccesedKey}),
        await markProcessed({processedKey,bucket,metaData})
    ])
    .catch(error => {
        console.log({error});
    })
    .finally(() => {
        console.log('Done', {
            processedKey,
            unproccesedKey,
            metaData,
        })
    })


    return;
};
