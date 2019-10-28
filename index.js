// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const http = require('http'); 

const CanFulfillIntentRequestHandler = {
  canHandle(handlerInput) {    
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'CanFulfillIntentRequest';
  },
  handle(handlerInput) {
    const canFulfillIntent = {
      canFulfill : 'YES',
      slots : {
        mySearchTopic : {
          canUnderstand : 'YES',
          canFulfill : 'YES',
        },
      },
    };
    return handlerInput.responseBuilder
      .withCanFulfillIntent(canFulfillIntent)
      .getResponse();
  },
};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Hi, I\'m the bus guy.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const DepartureEventIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'DepartureEvent';
    },
    handle(handlerInput) {
        
        let bus_route_slot = handlerInput.requestEnvelope.request.intent.slots.bus_route.resolutions.resolutionsPerAuthority[0];
        let bus_stop_slot = handlerInput.requestEnvelope.request.intent.slots.bus_stop.resolutions.resolutionsPerAuthority[0];
        
        let bus_route_name = bus_route_slot.values[0].value.name;
        let bus_stop_name = bus_stop_slot.values[0].value.name;
        
        let bus_route_id = bus_route_slot.values[0].value.id;
        let bus_stop_id = bus_stop_slot.values[0].value.id;
        
        return new Promise((resolve, reject) => {
            getDepartureTime(bus_route_id, bus_stop_id)
            .then(response => {
                resolve(handlerInput.responseBuilder
                    .speak(response)
                    //.reprompt(repromptOutput)
                    .getResponse());
            })
            .catch(error => {
                reject(handlerInput.responseBuilder
                    .speak(`I wasn't able to find any departures for ${bus_route_name} at ${bus_stop_name}`)
                    .getResponse());
            });
        });
       
    }
    
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const getDepartureTime = function(bus_route_id, bus_stop_id) {
    return new Promise((resolve, reject) => {
        const request = http.get(`http://realtime.catabus.com/InfoPoint/rest/StopDepartures/Get/${bus_stop_id}`, response => {
            response.setEncoding('utf8');
           
            let returnData = '';
            if (response.statusCode < 200 || response.statusCode >= 300) {
                return reject(new Error(`${response.statusCode}: ${response.req.getHeader('host')} ${response.req.path}`));
            }
            
            response.on('data', chunk => {
                returnData += chunk;
            });
           
            response.on('end', () => {
                
                let res = JSON.parse(returnData);
                
                for (var i = 0; i < res[0].RouteDirections.length; i++) {
                    let route = res[0].RouteDirections[i];
                    
                    if (route.RouteId.toString() === bus_route_id) {

                        let departure = route.HeadwayDepartures[0];
                        let time = departure.NextDeparture;
                        
                        if (time === "Due") {
                            resolve(`The next ${departure.ServiceDescription} is arriving now`);
                        } else {
                            resolve(`The next ${departure.ServiceDescription} will arrive at ${time}`);
                        }
                        
                        
                    }
                }
                
                resolve("Sorry. I couldn't find any departures for that bus route.");
            });
           
            response.on('error', error => {
                reject(error);
            });
        });
        request.end();
    });
}

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        DepartureEventIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();
