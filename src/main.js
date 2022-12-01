function getConfig(request) {
  const cc = DataStudioApp.createCommunityConnector();
  const config = cc.getConfig();

  config
    .newInfo()
    .setId('instructions')
    .setText('Enter the API key provided by Weezevent');

  config
    .newTextInput()
    .setId('key')
    .setName('API Key');

  return config.build();
}

function getFields() {
  const cc = DataStudioApp.createCommunityConnector();
  const fields = cc.getFields();
  const types = cc.FieldType;
  const aggregations = cc.AggregationType;

  fields
    .newDimension()
    .setId('eventName')
    .setName('Event name')
    .setType(types.TEXT);

  fields
    .newDimension()
    .setId('participants')
    .setName('Participants')
    .setType(types.NUMBER);

  return fields;
}

function getSchema(request) {
  return {schema: getFields().build()};
}

function getData(request) {
  const userProperties = PropertiesService.getUserProperties();
  const username = userProperties.getProperty('dscc.username');
  const password = userProperties.getProperty('dscc.password');

  const apiKey = request.configParams.key;
  const accessToken = getAccessToken(username, password, apiKey);

  const requestedFields = getFields().forIds(
    request.fields.map(({name}) => name)
  );

  const events = fetchEvents(apiKey, accessToken);

  return {
    schema: requestedFields.build(),
    rows: events.map((event) => {
      return {
        values: [event.name, event.participants]
      };
    })
  };
}

function getAuthType() {
  return {
    type: 'USER_PASS'
  };
}

function validateKey(username, password) {
  return !!(username && password);
}

function isAuthValid() {
  const userProperties = PropertiesService.getUserProperties();
  const username = userProperties.getProperty('dscc.username');
  const password = userProperties.getProperty('dscc.password');

  return validateKey(username, password);
}

function resetAuth() {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('dscc.username');
  userProperties.deleteProperty('dscc.password');
}

function setCredentials(request) {
  const creds = request.userPass;
  const username = creds.username;
  const password = creds.password;

  const userProperties = PropertiesService.getUserProperties();

  userProperties.setProperty('dscc.username', username);
  userProperties.setProperty('dscc.password', password);

  return {
    errorCode: 'NONE'
  };
}
 
function isAdminUser() {
  return true;
}

function getAccessToken(username, password, apiKey) {
  const url = `https://api.weezevent.com/auth/access_token`;

  const options = {
    method: 'post',
    payload: {
      username: username,
      password: password,
      api_key: apiKey
    }
  };

  const response = UrlFetchApp.fetch(url, options);
  const jsonString = response.getContentText();
  const parsed = JSON.parse(jsonString);

  return parsed.accessToken;
}

function fetchEvents(apiKey, accessToken) {
  const url = `https://api.weezevent.com/events?api_key=${apiKey}&access_token=${accessToken}`;
  const response = UrlFetchApp.fetch(url);
  const jsonString = response.getContentText();
  const parsed = JSON.parse(jsonString);

  return parsed.events;
}
