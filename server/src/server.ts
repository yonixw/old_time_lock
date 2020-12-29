import express, { Request } from "express";
import fetch from 'node-fetch'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ddbQueryRowsById, ddbCreateUpdateRow } from './dynamodb/utils';

import { genKey, getKeyID } from "./crypto/encryption";
import { fastFail } from './dynamodb/models';
import {
    DDB_TABLES,
    EncKeyRow, ExpressResult, fastData
} from './dynamodb/models';

import { apiCreateKey, apiListUserKeys, CreateKeyCommandInput } 
    from './dynamodb/apis';
import { ddbBasicAuth } from "./dynamodb/utils";

require("dotenv").config();
const client = new DynamoDBClient({ region: "eu-central-1" });

const app = express()
const port = 3000
app.use(require("morgan")("dev"));
app.use(ddbBasicAuth(client)); // will store user in header "xuser"
app.use(express.json({ limit: "5mb" }))

app.get('/', (req, res) => {
    const userId = req.headers.xuser;
    res.send(fastData('OK - user:' +userId ))
})

app.post('/createkey', async (req, res) => {
    const userId = req.headers.xuser as string;
    const body = req.body as CreateKeyCommandInput;
    const putResult = await apiCreateKey(client, body,userId);
    res.send(putResult);
})

app.get('/createkey_example1', async (req, res) => {
    const ep = "/createkey";
    const payload : CreateKeyCommandInput = {
        nickname: "key_nick_" + Date.now()
        //(optional) key: genKey()
    };
    const data = await postEndpoint<CreateKeyCommandInput>(ep, payload,req);
    res.send(data);
})

app.get('/listkeys', async (req, res) => {
    const userId = req.headers.xuser as string;
    const listResult = await apiListUserKeys(client, userId);
    res.send(listResult);
})

app.listen(port, () => {
    console.log(`❤ ❤ [APP] listening at http://localhost:${port}`)
})


async function postEndpoint<T>(
    ep: string, payload: T,
        req: Request<any, any, any, any>) {
    const test_resp = await fetch(`http://localhost:${port}${ep}`, {
        method: "POST",
        headers: {
            "authorization":req.headers.authorization,
            "content-type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const data = await test_resp.json();
    return data;
}

