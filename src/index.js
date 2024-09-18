import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { KJUR } from 'jsrsasign'
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

const ZOOM_MEETING_SDK_KEY =  "rsf0GiuaQUeidIuRVkmig";
const ZOOM_MEETING_SDK_SECRET = "yBYPiclGUi1JGE5xPK42V8rGkrs2OO0Z";
const schemaValidations = [isRequiredAllOrNone(['meetingNumber', 'role'])]

const coerceRequestBody = (body) => ({
  ...body,
  ...['role', 'expirationSeconds'].reduce(
    (acc, cur) => ({ ...acc, [cur]: typeof body[cur] === 'string' ? parseInt(body[cur]) : body[cur] }),
    {}
  )
})

app.post('/', (req, res) => {
  const requestBody = coerceRequestBody(req.body)
  console.log('Request Body:', requestBody)
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

app.listen(port, () => console.log(`Zoom Meeting SDK Auth Endpoint Sample Node.js, listening on port ${port}!`))
