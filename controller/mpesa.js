const express = require('express');
//const router = express.Router();
const axios = require('axios')
require('dotenv').config()
const { db } = require('../firebase')


const port = process.env.PORT
const stk_url = process.env.STK_URL
const auth_url = process.env.AUTH_URL
const shortcode = process.env.SHORTCODE
const passkey = process.env.PASSKEY
const consumerKey = process.env.CONSUMER_KEY
const consumerSecret = process.env.CONSUMER_SECRET_KEY

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
            "CallBackURL": "https://uabiri-mpesa-api.onrender.com/callback",
            "AccountReference": `Uabiri - ${req.body.vehicleRegistration}`,
            "TransactionDesc": "Test"
        },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then(async(response) => {

            res.status(200).json(response.data)

            console.log(response.data)
            let responseData = response.data
            if (responseData.ResponseCode == 0) {
                let checkOutID = responseData.CheckoutRequestID
                  //Add information to database with CheckoutRequestID and any other data
                 const transactionsRef = db.collection('Transactions').doc(checkOutID)
 
                 const res2 = await transactionsRef.set({
                      vehicleRegistration: req.body.vehicleRegistration,
                      saccoName: req.body.saccoName,
                      routeName: req.body.routeName,
                      timestamp:current_timestamp()
                  })
                 
             } else {
                 res.send(responseData.ResponseDescription)
              }
           
        }).catch((err) => {
            let err_status = err
            console.log(err_status)
            //res.status(err_status).send({ message: err.response.data.errorMessage })
        }

        )

}

const lipaNaMpesaOnlineCallback =  async(req, res) => {

    //Get the transaction description
    let resultSTKData = req.body.Body.stkCallback
    //TODO Check if resonse is 0 if yes proceed to update database
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