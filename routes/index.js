const express = require('express');

const router = express.Router();

//controllers
const mpesa = require('../controller/mpesa');

//route to get the auth token
router.get('/mpesa-token',mpesa.mpesaToken);

//lipa na mpesa online 
router.post('/stk-push',mpesa.mpesaToken, mpesa.mpesaSTKPush);

router.get('/lipa-na-mpesa-password',mpesa.mpesaPassword);

//callback url
router.post('/callback',mpesa.lipaNaMpesaOnlineCallback);

module.exports = router;