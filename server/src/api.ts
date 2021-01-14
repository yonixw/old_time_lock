import { encrypt, genKey, getKeyID, signHashSalt, decrypt } from './crypto/encryption';

require("dotenv").config();
export const PASS_SIGN_SALT = "PASS_ID_HASH"
export const TIME_SIGN_SALT="TIMESLOT_DATA";
export const APP_PASS = process.env.APP_SECRET;

export interface PassHashId {
    salt:string, pass_id: string
}

export interface SignedTimeslot {
    from: number,
    to: number
    sign: string,
    passId: PassHashId
}

export interface EncryptState {
    encdata: string,
    passId: PassHashId
}

export function getAppPassHashID(salt?:string):PassHashId {
    let result: PassHashId = {
        salt: "",
        pass_id: ""
    };

    result.salt = salt || genKey(10);
    result.pass_id = signHashSalt(result.salt, PASS_SIGN_SALT , APP_PASS);
    return result;
}

export function encryptData(plaintext:string) : EncryptState {
    const encdata = encrypt(plaintext, APP_PASS);
    const passId: PassHashId = getAppPassHashID();

    return {
        encdata,
        passId
    }
}

export function appPassDecrypt(password: string, encrypted: EncryptState) :string {
    let result = "Init";
    try {
        if (signHashSalt(encrypted.passId.salt, PASS_SIGN_SALT , APP_PASS) 
                    !== encrypted.passId.pass_id) {
            result = "Pass Id does not match"; // Not security!! just to avoid server mismatch
        }
        else {
            if (APP_PASS !== password) {
                result = "Password is incorrect" // Security check
            }
            else {
                result = decrypt(encrypted.encdata, APP_PASS);
            }
        }
    } catch (error) {
        result = `${error}`;
    }
    return result;
}

export function signTimeslot(plaintext:string, from:number, to:number) : SignedTimeslot{
    
    const encdata = encryptData(plaintext);

    let dataResult = "Init";
    if (from > to) {
        dataResult = "from>to! error!";
    }
    else {
        try {
            dataResult = signHashSalt(TIME_SIGN_SALT, `${from}|${to}|${plaintext}`, APP_PASS);
        } catch (error) {
            dataResult = error
        }
    }

    return {
        from: from, to:to, sign: dataResult,
        passId: getAppPassHashID()
    }
}

export function timeslotDecrypt(timeslot: SignedTimeslot, encrypted: EncryptState) : string{
    let result = "init";
    try {
        if (signHashSalt(encrypted.passId.salt, PASS_SIGN_SALT , APP_PASS) 
                !== encrypted.passId.pass_id) {
            result = "Pass Id does not match"; // Not security!! just to avoid server mismatch
        }
        else {
            const plainData = decrypt(encrypted.encdata,APP_PASS);
            if (signHashSalt(TIME_SIGN_SALT,
                 `${timeslot.from}|${timeslot.to}|${plainData}`, APP_PASS) != timeslot.sign) {
                    result = "Timeslot sign mismatch";
            }
            else {
                const nowtime = Date.now()
                if (timeslot.from <= nowtime && timeslot.to >= nowtime ) {
                    result = plainData;
                }
                else {
                    result = "Not in time interval!";
                }
            }
        }
    } catch (error) {
        result = `${error}`
    }
    return result;
}