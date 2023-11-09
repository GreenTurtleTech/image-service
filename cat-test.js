//Test with staging
// node cat-test.js
// Need to export AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY first
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');

const body = fs.createReadStream('./cat.png');
const Bucket = 'protect-earth-stag-photos-57324';

const client = new S3Client({ region: "eu-west-2" });
const date = new Date();
const dateString = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}-${date.getHours()}:${date.getMinutes()}`;
const Key = `treeuploads/cat-${dateString}.png`;
const command = new PutObjectCommand({
    Bucket,
    Key,
    Body: body,
    Metadata: {
        "Content-Type": "image/png",
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
    console.log({Key,status: data.$metadata.httpStatusCode});
}).catch((error) => {
    console.log({error});
});
