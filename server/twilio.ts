// Twilio integration for video calls
// Referenced from Twilio connector integration

import twilio from 'twilio';
const { jwt: { AccessToken } } = twilio;
const VideoGrant = AccessToken.VideoGrant;

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

export async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

/**
 * Generate an access token for a user to join a Twilio Video room
 * @param identity - Unique identifier for the user (e.g., their user ID)
 * @param roomName - The name of the video room to join
 * @returns Access token string for the client to use
 */
export async function generateVideoAccessToken(identity: string, roomName: string): Promise<string> {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  
  // Create an access token
  const token = new AccessToken(
    accountSid,
    apiKey,
    apiKeySecret,
    { identity }
  );
  
  // Create a Video grant and add it to the token
  const videoGrant = new VideoGrant({
    room: roomName
  });
  token.addGrant(videoGrant);
  
  return token.toJwt();
}

/**
 * Create a new Twilio Video room
 * @param roomName - Unique name for the room
 * @returns Room details
 */
export async function createVideoRoom(roomName: string) {
  const client = await getTwilioClient();
  
  try {
    // Check if room already exists
    const existingRoom = await client.video.v1.rooms(roomName).fetch();
    return existingRoom;
  } catch (error: any) {
    // Room doesn't exist, create it
    if (error.code === 20404) {
      const room = await client.video.v1.rooms.create({
        uniqueName: roomName,
        type: 'group', // Supports screen sharing
        maxParticipants: 10
      });
      return room;
    }
    throw error;
  }
}

/**
 * End a Twilio Video room
 * @param roomName - Name of the room to end
 */
export async function endVideoRoom(roomName: string) {
  const client = await getTwilioClient();
  
  try {
    await client.video.v1.rooms(roomName).update({ status: 'completed' });
  } catch (error: any) {
    // Ignore if room doesn't exist
    if (error.code !== 20404) {
      throw error;
    }
  }
}
