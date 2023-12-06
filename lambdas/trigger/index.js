const { S3 } = require('aws-sdk');
const s3 = new S3({ apiVersion: '2006-03-01' });

const UNPROCCESED_PREFIX = 'unituploads/';
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
async function getMetaData({unproccesedKey, bucket, region}) {
    try {
        const metaData = await s3.headObject({
            Bucket: bucket,
            Key: unproccesedKey,
        }).promise();
        // iOS app sends metaData.Metadata
        const metaDataFromIos = metaData.Metadata;
        const dateTaken = metaDataFromIos.datetaken ? metaDataFromIos.datetaken : '';
        const latitude = metaDataFromIos.latitude ? parseFloat(metaDataFromIos.latitude) : null;
        const longitude = metaDataFromIos.longitude ? parseFloat(metaDataFromIos.longitude) : null;
        const species = metaDataFromIos.species || '';
        const supervisor = metaDataFromIos.supervisor || '';
        const site = metaDataFromIos.site || '';
        return {
            latitude,
            longitude,
            supervisor: {
                id: supervisor
            },
            species: {
                id: species
            },
            site: {
                id: site
            },
            planted_at: dateTaken,
            image_url: `https://s3-${region}.amazonaws.com/${bucket}/${unproccesedKey}`,
        };

    } catch (err) {
        console.log({ err });
        throw new Error(`Error getting object ${unproccesedKey} from bucket ${bucket}.`);
    }

}

//POST to the tree api
async function pushToTreeTracker({metaData, treeApiUrl,token,unproccesedKey}) {


    try {
        // Docs: https://bump.sh/green-turtle/doc/tree-tracker-api/operation/operation-post-upload#operation-post-upload-body-application-json-image_url
        const res = await fetch(`${treeApiUrl}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Idempotency-Key': unproccesedKey,
            },
            body: JSON.stringify(metaData),
        });
        const valid = res.status >= 200 && res.status < 300;
        if( ! valid ) {
            const responseBody = await res.json();
            console.log({pushToTreeTrackerApi:{
                valid,
                status: res.status,
                statusText: res.statusText,
                responseBody,
            }});
        }else{
            console.log({pushToTreeTrackerApi:{
                valid,
                status: res.status,
                statusText: res.statusText,
            }});
        }

        // return true if 20X status code
        return res.status >= 200 && res.status < 300;
    } catch (err) {
        console.log({ err });
        return false;

    }
}

// Put JSON file of meta data with name processedKey in processed folder
async function markProcessed({processedKey,bucket,metaData}) {
    try {
        const results = await s3.putObject({
            Bucket: bucket,
            Body: JSON.stringify(metaData),
            Key: processedKey,
        }).promise();
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
    const processedKey = `${unproccesedKey.replace(UNPROCCESED_PREFIX, PROCESSED_PREFIX)}.json`;
    const {
        treeApiUrl,
        region,
        token
    } = process.env;
    const completed = await hasProcesseded({processedKey, bucket});
    if( completed ) {
        console.log('Already processed',{hasProcesseded, processedKey});
        return;
    }
    const metaData = await getMetaData({unproccesedKey, bucket,region});
    console.log({metaData,treeApiUrl});

    const pushed = await pushToTreeTracker({metaData, treeApiUrl,token,unproccesedKey});
    if( ! pushed    ) {
        throw new Error(`Error pushing object ${unproccesedKey} to tree api.`);
    }
    const moved = await markProcessed({processedKey,bucket,metaData});
    if( ! moved ) {
        throw new Error(`Error moving object ${unproccesedKey} to ${processedKey}`);
    }
    console.log('Done', {
        processedKey,
        unproccesedKey,
        metaData,
        moved
    })
    return;
};
