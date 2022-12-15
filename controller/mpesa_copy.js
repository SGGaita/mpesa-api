const express = require('express');
//const router = express.Router();
const axios = require('axios')
const timeStamp = require('../middleware/timestamp').timestamp
require('dotenv').config()
const {
    db
} = require('../firebase')



const passkey = process.env.PASSKEY
const shortcode = process.env.SHORTCODE
const consumerKey = process.env.CONSUMERKEY
const consumerSecret = process.env.CONSUMERSECRET
const oauth_token_url = process.env.AUTH_URL
const stkURL = process.env.STK_URL

//Current timestamp
const current_timestamp = () => {
    let year = new Date().getFullYear();
    let month = new Date().getMonth();
    month = month < 10 ? `0${month}` : month;
    let day = new Date().getDay();
    day = day < 10 ? `0${day}` : day;
    let hour = new Date().getHours();
    hour = hour < 10 ? `0${hour}` : hour;
    let minute = new Date().getMinutes();
    minute = minute < 10 ? `0${minute}` : minute;
    let second = new Date().getSeconds();
    second = second < 10 ? `0${second}` : second;

    return `${year}${month}${day}${hour}${minute}${second}`;

};



//!This works and password is generated correctly
//Generate new Mpesa password
const newPassword = () => {
    const passString = shortcode + passkey + current_timestamp()
    const base64EncodedPassword = Buffer.from(passString).toString('base64')

    return base64EncodedPassword
}

//Generate Mpesa password
const mpesaPassword = (req, res) => {
    res.send(newPassword())
}



//?Works returns mpesaToken
//Generate Mpesa token
const mpesaToken = (req, res, next) => {
    const auth = 'Basic ' + Buffer.from(consumerKey + ":" + consumerSecret).toString("base64");
    const headers = {
        Authorization: auth,
    };

    axios.get(oauth_token_url, {
        headers: headers,
    })
        .then((response) => {
            let data = response.data
            let access_token = data.access_token
            req.token = access_token;
            next();
        })
        .catch((error) => console.log(error));
}



const mpesaSTKPush = (req, res, next) => {

    const token = req.token
    console.log("Req body", req.body)
    const headers = {
        Authorization: 'Bearer ' + token
    };


    let data = {
        "BusinessShortCode": '174379',
        "Password": newPassword(),
        "Timestamp": current_timestamp(),
        "TransactionType": "CustomerPayBillOnline",
        "Amount": req.body.amount,
        "PartyA": req.body.phoneNumber,
        "PartyB": '174379',
        "PhoneNumber": req.body.phoneNumber,
        "CallBackURL":`https://kidslove.co.ke/callback/callback.php`, 
        "AccountReference": "UAbiri",
        "TransactionDesc": 'Pay UAbiri fare'
    }
    axios.post(stkURL, data, {
        headers: headers
    })
        .then(async(response, status) => {

            console.log("response from stk", response.data)
            let responseData = response.data
             if (responseData.ResponseCode == 0) {
               let checkOutID = responseData.CheckoutRequestID
                 //Add information to database with CheckoutRequestID and any other data
                const transactionsRef = db.collection('Transactions').doc(checkOutID)

                const res2 = await transactionsRef.set({
                     vehicleRegistration: req.body.vehicleRegistration,
                    saccoName: req.body.saccoName,
                     routeName: req.body.routeName
                 })
                
            //     // res.send({
            //     //     success: true,
            //     //     message: responseData.ResponseDescription
            //     // });
            } else {
                res.send(responseData.ResponseDescription)
             }
        })
        .catch((error) => console.log('this error', error));
}


const lipaNaMpesaOnlineCallback = async(req, res) => {

    // //Get the transaction description
    let resultSTKData = req.body.Body.stkCallback
    console.log("resultSTKData", resultSTKData)

     if (resultSTKData.ResultCode == 0) {
         let callbackdata = req.body.Body.stkCallback.CallbackMetadata.Item
        console.log(callbackdata)
         let data = {}

         //convert the callback item from Array of Objs to Object of Objs
         callbackdata.forEach(e => {
             data = { ...data, [e.Name]: e.Value }
             //check if there exists a property Balance if yes delete it from the data object
            delete data.Balance
        }
         )
         //console.log("hasOwnProperty", data.hasOwnProperty('Balance'))

         console.log("CBD", data)

        const transactionsRef = db.collection('Transactions').doc(resultSTKData.CheckoutRequestID)
         const res2= await transactionsRef.update(data)
        res.send({
             success: true,
             message: resultSTKData.ResultDescription
        });
     } else {
       res.send(resultSTKData.ResultDescription) 
     }



};



module.exports = {
    mpesaPassword,
    mpesaToken,
    lipaNaMpesaOnlineCallback,
    mpesaSTKPush,
    current_timestamp
}