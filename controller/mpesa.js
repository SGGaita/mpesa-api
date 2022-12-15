const express = require('express');
//const router = express.Router();
const axios = require('axios')
require('dotenv').config()
const { db } = require('../firebase')


const port = process.env.PORT
const stk_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
const auth_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
const shortcode = "174379"
const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
const consumerKey = "dUSP2ZSvs0IoOloIiCniORUsQX8GBz5w"
const consumerSecret = "RXDkBLFGA3Z0GAEr"

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


//Generate Mpesa token
const mpesaToken = (req, res, next) => {
    const auth = 'Basic ' + Buffer.from(consumerKey + ":" + consumerSecret).toString("base64");
    const headers = {
        Authorization: auth,
    };

    axios.get(auth_url, {
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

const mpesaSTKPush = async (req, res) => {

    const phone = req.body.phoneNumber;
    const amount = req.body.amount

    const token = req.token

    await axios.post(stk_url,
        {
            "BusinessShortCode": process.env.SHORTCODE,
            "Password": newPassword(),
            "Timestamp": current_timestamp(),
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": process.env.SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": "https://17a9-197-254-34-66.ngrok.io/callback",
            "AccountReference": "U Abiri",
            "TransactionDesc": "Test"
        },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then((response) => {
            res.status(200).json(response.data)
        }).catch((err) => {
            let err_status = err.response.status
            res.status(err_status).send({ message: err.response.data.errorMessage })
        }

        )

}

const lipaNaMpesaOnlineCallback = (req, res) => {

    //Get the transaction description
    let message = req.body.Body.stkCallback
    //TODO Check if resonse is 0 if yes proceed to update database
    console.log("Callback middleware", message)

    // const transactionsRef = db.collection('Transactions').doc(message.Item[1].Value)
    //  const res2 = await transactionsRef.set(
    //   {
    //    amount: message.Item[0].Value, 
    //    transactionCode: message.Item[1].Value,
    //    date: message.Item[3].Value,
    //    phoneNumber: message.Item[4].Value
    //   }
    // )
    // console.log({
    //     success:true,
    //     message
    // });

};



module.exports = {
    mpesaPassword,
    mpesaToken,
    lipaNaMpesaOnlineCallback,
    mpesaSTKPush,
    current_timestamp
}