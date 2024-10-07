import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { KJUR } from 'jsrsasign'
import axios from 'axios'
import qs from 'querystring';  // Used to serialize the body as x-www-form-urlencoded
import { inNumberArray, isBetween, isRequiredAllOrNone, validateRequest } from './validations.js'

dotenv.config()
const app = express()
const port = process.env.PORT || 4000

app.use(express.json(), cors())
app.options('*', cors())

const propValidations = {
  role: inNumberArray([0, 1]),
  expirationSeconds: isBetween(1800, 172800)
}

const ZOOM_MEETING_SDK_KEY = "ripqfBNqQ5e8dSdrWMKpA";
const ZOOM_MEETING_SDK_SECRET = "J1ODXRNdWSL087mcAApsR0HLSJFdv5Uz";
//-----------------------------------------
// const ZOOM_MEETING_SDK_KEY = "p9ZvyOLMT_ihW2e8naMgiQ";
// const ZOOM_MEETING_SDK_SECRET = "kE8xnneZg1j6Y1lSfw33O0ngD9F8Kl7I";


const schemaValidations = [isRequiredAllOrNone(['meetingNumber', 'role'])]

const coerceRequestBody = (body) => ({
  ...body,
  ...['role', 'expirationSeconds'].reduce(
    (acc, cur) => ({ ...acc, [cur]: typeof body[cur] === 'string' ? parseInt(body[cur]) : body[cur] }),
    {}
  )
})

const getToken = async () => {
  const username = "p9ZvyOLMT_ihW2e8naMgiQ";
  const password = "kE8xnneZg1j6Y1lSfw33O0ngD9F8Kl7I";
  const authString = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      qs.stringify({
        grant_type: 'account_credentials',
        account_id: 'GP5bgMnFRUGtuzXuEc_RuA'
      }),
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data; // Ensure the correct data is returned

  } catch (error) {
    throw error; // Ensure errors are properly propagated
  }
};

//-----------------------------------------
app.post('/', (req, res) => {
  const requestBody = coerceRequestBody(req.body)
  const validationErrors = validateRequest(requestBody, propValidations, schemaValidations)

  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors })
  }

  const { meetingNumber, role, expirationSeconds } = requestBody
  const iat = Math.round(new Date().getTime() / 1000) - 60
  const exp = iat + 60 * 60 * 2;
  const oHeader = { alg: 'HS256', typ: 'JWT' }
  const oPayload = {
    appKey: ZOOM_MEETING_SDK_KEY,
    sdkKey: ZOOM_MEETING_SDK_KEY,
    mn: meetingNumber,
    role,
    iat,
    exp,
    tokenExp: exp
  }

  const sHeader = JSON.stringify(oHeader)
  const sPayload = JSON.stringify(oPayload)
  const sdkJWT = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, ZOOM_MEETING_SDK_SECRET);
  return res.json({ signature: sdkJWT })
})

//--------------------------------------------
app.post('/creareMeeting', async(req, res) => {
  // get token from api  https://zoom.us/oauth/token?grant_type=account_credentials&account_id=GP5bgMnFRUGtuzXuEc_RuA post

  let token = "";
  try {
    const response = await getToken();
    token = response.access_token;
    console.log("Response from getToken:", response.access_token);
  } catch (error) {
    console.error("Error in creating token:", error);
  }
  // const requestBody = req.body

  const requestBody = {
    topic: "zoom1",
    type: 2,
    start_time: "2024-09-19T10:00:00",
    duration: 60,
    timezone: "Africa/Cairo",
    password: "123456",
    agenda: "testing",
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: true,
      mute_upon_entry: true,
      breakout_room: {
        enable: true,
      },
    }
  }

  axios.post('https://api.zoom.us/v2/users/me/meetings', requestBody, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      return res.json({ response: response.data })
    })
    .catch(error => {
      console.log("error :: ", error.response.data);
      return res.json({ error: error.response.data });
    })
})



/// --------------------------------------------------
app.post('/createToken', async (req, res) => {
  try {
    const response = await getToken();
    console.log("Response from getToken:", response);
    return res.json({ response });
  } catch (error) {
    console.error("Error in creating token:", error);
    return res.status(500).json({ error: 'Failed to create token' });
  }
});

app.listen(port, () => console.log(`Zoom Meeting SDK Auth Endpoint Sample Node.js, listening on port ${port}!`))
