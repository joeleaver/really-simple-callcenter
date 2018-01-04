var config = require('../config/config.json');
var RSMQWorker = require( "rsmq-worker" );
var worker = new RSMQWorker(config.queue.name, {
  host: config.queue.redis_host,
  port: config.queue.redis_port,
  redisPrefix: config.queue.redis_namespace,
  interval: [ .1, 1 ],	// wait 100ms between every receive and step up to 1 on empty receives
  invisibletime: 30,	// hide received message for 30 seconds, which should give us enough time to dial an agent
  timeout: 0
});
var plivo = require('plivo');
var client = new plivo.Client(config.plivo.auth_id, config.plivo.auth_token);

worker.on( "message", function( conference_name, next, id ){

    console.log("Processing Message ID: " + id);
    console.log(conference_name);

    //simulate some via random time, then add the agent to the conference
    setTimeout(function () {

      // Check to make sure conference still exists and isn't empty
      client.conferences.get(
        conference_name,
      ).then(function (response) {
        if (response.conferenceMemberCount > 0) {
          // Call the Agent
          // This is simplistic, but easily adapted to call and hunt multiple agents
          client.calls.create(
            config.app.caller_id_number,
            config.app.agent_number,
            config.base_url + "/attach_agent/" + conference_name
          ).then(function(call_created) {
            console.log(call_created)
          }).catch(function(response) {
            console.log("\nError:", response);
            next(false); // there was a problem contacting an agent. Don't dequeue, let worker try again
            return;
          });
          // The agent answered, remove the message from the queue
          next();
        }
      }, function (err) {

        if (err.error = "conference not found") {
          console.log("Conference Not Found, Dequeueing")
        }else{
          console.error(err);
        };

        next();
      });
    }, getRandomInt(3000,7000));
});

//  error listeners
worker.on('error', function( err, msg ){
    console.log( "ERROR", err, msg.id );
});
worker.on('exceeded', function( msg ){
    console.log( "EXCEEDED", msg.id );
});
worker.on('timeout', function( msg ){
    console.log( "TIMEOUT", msg.id, msg.rc );
});

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

worker.start();
