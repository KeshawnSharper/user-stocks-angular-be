const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const plaid = require('plaid');
const app = express();
const finnhub = require('finnhub');
const fs = require("fs");

require('dotenv').config()
app.use(cors())
//add code here
const PORT = process.env.PORT || 3005;
;

const { PLAID_CLIENT_ID,PLAID_SECRET} =
  process.env;

// import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
const configuration = new plaid.Configuration({
  basePath: plaid.PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});


app.use(
    bodyParser.urlencoded({
      extended: true,
    }),
  );
  app.use(bodyParser.json());
 
const plaidClient = new plaid.PlaidApi(configuration);

// const AWS = require("aws-sdk");
const { Products } = require('plaid');

//   AWS.config.update({
//     accessKeyId: AWS_ACCESS,
//     secretAccessKey: AWS_SECRET,
//     region: AWS_REGION_ID
// })
// const dynamoDB = new AWS.DynamoDB.DocumentClient()

// let scanDB = async (table,filterID,filterProp) => {
//   let items = await dynamoDB.scan({TableName: table}).promise()
//   items = items["Items"]
//   if (filterID !== null){
//     items = items.filter(item => item[`${filterProp}`] === filterID)
//   }
//   return items

// }

// let putDB = async (table,item) => {
//     await dynamoDB.put({TableName: table,Item:item}).promise()
//   }
//   let deleteDB = async (table,id) => {
//     await dynamoDB.delete({TableName: table,Key:{id:`${id}`}}).promise()
//   }
//   let mapToObj = (arr,filterID) => {
//       console.log(arr[0])
//     let obj = {}
//     arr.map(item => {
//         obj[item[filterID].toString()] = true
//     })
//     return obj

//   }
  app.post("/get_saved_stocks",async (req,res) => {
    res.send(JSON.parse(req.body.data))
})

app.post("/link_token",async (req,res) => {
    const request = {
         user: {
           client_user_id: '87JlBEeRa5IwZPgd8Rw4hbKD3Ex4KAuwkxAMo',
          },
         client_name: 'none',
         products: ["auth", "transactions"],
          country_codes: ["US"],
          language: 'en',
          webhook: 'https://sample-web-hook.com',
          redirect_uri: 'https://localhost:51163/',
          account_filters: {
            depository: {
          account_subtypes: ['checking', 'savings'],
            },
          },
        };
        try {
          const response = await plaidClient.linkTokenCreate(request)
          const linkToken = response.data.link_token;
        //   console.log(linkToken)
          res.send({link_token:response.data.link_token})
        } catch (error) {
          // handle error
          console.log(error)
        }
    
})
app.post("/sync_user_to_bank_account",async(req,res) => {
    // Generate a access token
    // console.log
    let accessToken = await plaidClient.itemPublicTokenExchange({"public_token":req.body.public_token});
    // Store a public token 
    console.log(accessToken)
    accessToken = accessToken.data

    // access token credentials
//     let access_creds = {"access_token":accessToken.access_token,start_date: '2018-01-01',end_date: '2022-01-12'}

    
//     // Store transactions
//     let transactions = await plaidClient.transactionsGet(access_creds)
//     transactions = transactions.data.transactions;
//     console.log(transactions[0])

//     if (req.body && req.body.user_id){

    
//     // get the transactions count from DB
//     let transactions_count = await scanDB("cpa_user_transactions")
//     transactions_count  = transactions_count.length

//     // populate the transactions to the dummy user
//     transactions.map(async(item,index) =>{
//         let newItem = item
//         newItem.user_id = req.body.user_id
//         newItem.id = (transactions_count + index).toString()
//         await putDB("cpa_user_transactions",newItem)
//     }
//     )
    
//     }
//     //store investments
//     let investments = await plaidClient.investmentsHoldingsGet({"access_token":accessToken.access_token})
//     investments = {
//         securities:investments.data["securities"],
//         accounts:investments.data["accounts"],
//         holdings:investments.data["holdings"]}

//         if (req.body && req.body.user_id){

//      // get the transactions count from DB
//      let investments_count = await scanDB("cpa_user_investments")
//      investments_count  = investments_count.length

//     // Only storing the securities to the database
//     investments.securities.map(async (item,index) =>  {
//         let newItem = item
//         newItem.user_id = req.body.user_id
//         newItem.id = (investments_count + index).toString()
//         await putDB("cpa_user_investments",newItem)
//     })
// }
//     // store the result 
//     // dont forget to add ",investments:investments"
//     let result = {accessToken:accessToken,transactions:transactions,investments:investments}

    // send result 
    res.send(accessToken)
    
})
app.get('/link_with_transactions/:accessToken',async(req,res) => {
  let creds =  {"access_token":req.params.accessToken,start_date: '2018-01-01',end_date: '2022-01-27'}
  let transactions = await plaidClient.transactionsGet(creds)
  
    transactions = transactions.data.transactions;
    res.send(transactions)
})
app.get('/link_with_balance/:accessToken',async(req,res) => {
  let creds =  {"access_token":req.params.accessToken}
  let response = await plaidClient.accountsBalanceGet(creds)
  const accounts = response.data.accounts; 
    res.send(accounts)
})
app.get('/user_transactions/:user_id',async(req,res) => {
    let user_transactions = await scanDB("cpa_user_transactions",Number(req.params.user_id),"user_id")
    res.send(user_transactions)
})
app.get('/user_investments/:user_id',async(req,res) => {
    let user_investments = await scanDB("cpa_user_investments",Number(req.params.user_id),"user_id")
    res.send(user_investments)
})
app.delete('/user_transactions/:id',async(req,res) => {
    //Add security - req.body.user must match transactions'
    
    let user_transaction = await scanDB("cpa_user_transactions",req.params.id,"id")
    user_transaction = user_transaction[0]
    console.log(user_transaction)
    if (!req.body){
        res.status(500).send("User ID required in the body")
        return
    }
    if (Number(req.body.user_id) !== Number(user_transaction.user_id)){
        res.status(500).send({message:"request.user_id must match transaction.user_id"})
        return
    }
    // get trashed transaction count for ID 
    let trashed_transactions_count = await scanDB("cpa_trashed_transactions")
    trashed_transactions_count = trashed_transactions_count.length

    // add transaction to trashed transactions
    await putDB("cpa_trashed_transactions",{id:trashed_transactions_count.toString(),user_id:req.body.user_id,transaction_id:req.params.id})
    
    // delete from transactions 
    await deleteDB("cpa_user_transactions",req.params.id)

    // send back an updated list of users

    let updated_user_transactions = await scanDB("cpa_user_transactions")

    res.status(200).send({message:"Transaction has been sent to trash, heres the Item back and an updated list",item:user_transaction,updated_user_transactions:updated_user_transactions})
    
})
app.delete('/user_investments/:id',async(req,res) => {
    //Add security - req.body.user must match transactions'
    
    let user_investment = await scanDB("cpa_user_investments",req.params.id,"id")
    user_investment = user_investment[0]
    console.log(user_investment)
    if (!req.body){
        res.status(500).send("User ID required in the body")
        return
    }
    if (Number(req.body.user_id) !== Number(user_investment.user_id)){
        res.status(500).send({message:"request.user_id must match investment.user_id"})
        return
    }
    // get trashed investment count for ID 
    let trashed_investments_count = await scanDB("cpa_trashed_investments")
    trashed_investments_count = trashed_investments_count.length

    // add investment to trashed investments
    await putDB("cpa_trashed_investments",{id:trashed_investments_count.toString(),user_id:req.body.user_id,investment_id:req.params.id})
    
    // delete from investments 
    await deleteDB("cpa_user_investments",req.params.id)

    // send back an updated list of users

    let updated_user_investments = await scanDB("cpa_user_investments")

    res.status(200).send({message:"investment has been sent to trash, heres the Item back and an updated list",item:user_investment,updated_user_investments:updated_user_investments})
    
})
app.get('/investments/:id',async(req,res) => {
    let investment = await scanDB("cpa_user_investments",req.params.id,"id")
    res.send(investment)
})
app.get('/transactions/:id',async(req,res) => {
    let transaction = await scanDB("cpa_user_transactions",req.params.id,"id")
    res.send(transaction)
})
app.get('/trashed_transactions/:user_id',async(req,res) => {
    let trashed_transactions = await scanDB("cpa_trashed_transactions",Number(req.params.user_id),"user_id")
    res.send(trashed_transactions)
})
app.get('/trashed_investments/:user_id',async(req,res) => {
    let trashed_investments = await scanDB("cpa_trashed_investments",Number(req.params.user_id),"user_id")
    res.send(trashed_investments)
})
app.get("/live_stocks",async(req,res) => {

const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = ""
const finnhubClient = new finnhub.DefaultApi()

finnhubClient.quote("AAPL", (error, data, response) => {
  console.log(data)
});
})
app.get("/symbols",(req,res) => {
  let arr = []
  let obj = {}
  fs.readFileSync('./Symbols.txt').toString().split('\n').forEach(function (line,index) { 
    arr.push({label:line.toString(),id:index})
    obj[line] = true
});
res.send({arr:arr,obj:obj})

})
app.listen(PORT, () => console.log(`listening on port ${PORT}!`));