const { S3Client, CopyObjectCommand,PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');


/**
 * This is a test script to upload a file to the bucket
 *
 * node uploadCat.js
 */
const body = fs.createReadStream('./smolcat-wide.png');
const Bucket = 'testimgtree';

const client = new S3Client({ region: "us-east-2" });

const command = new PutObjectCommand({
    Bucket,
    Key: `treeuploads/smolcat-19.png`,
    Body: body,
    Metadata: {
        phimageid: '1222-bbbb-3333-cccc',
        dateTaken: '2021-10-21T12:00:00Z',
        //40.4406° N, 79.9959° W
        latitude: '40.4406',
        longitude: '79.9959',
        species: '1111-aaaa-222-rrrr',
        supervisor: '1111-aaaa-222-rrrr',
        site: '1111-aaaa-222-rrrr',
    },
});

client.send(command).then((data) => {
    console.log(data.$metadata);
}).catch((error) => {
    console.log({error});
});
