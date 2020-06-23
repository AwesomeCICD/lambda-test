import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import axios from 'axios';
import * as AWS from 'aws-sdk';

const autoScaling = new AWS.AutoScaling();

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

const SERVICES_IP = `3.135.219.25`;
const NOMAND_CLIENT_IG = 'ASG'
const LIFECYCLE_HOOK = 'Hook'

const api = axios.create({
  baseURL: `http://${SERVICES_IP}:4646/v1/`,
  timeout: 1000,
  headers: {'Content-Type': 'application/json'}
});

export const flagNodes: APIGatewayProxyHandler = async (event, _context) => {
  let response = {
      statusCode: 200,
      body: JSON.stringify('Successfully started draining nomad clients'),
  };

  try {
    let { data: nodes } = await api.get('nodes');
    await asyncForEach(nodes, async (node) => {
      // Deadline of 1 hour
      const drainPayload = {
        "DrainSpec": {
          "Deadline": 36000000000,
          "IgnoreSystemJobs": true
        }
      };

      let { status } = await api.post(`node/${node.ID}/drain`, drainPayload);

      if(status !== 200){
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: 'Go Serverless Webpack (Typescript) v1.0! Your function executed successfully!',
          }, null, 2),
        };
      }

    });

  } catch (error) {

    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Go Serverless Webpack (Typescript) v1.0! Your function executed successfully!',
      }, null, 2),
    };
    
  }

  return response;
}

export const descaleCluster: APIGatewayProxyHandler = async (event, _context) => {
  let response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully started scale-in process of nomad clients',
      }, null, 2),
  };

  try {
    let { data: nodes } = await api.get('nodes');
    let eligibleNodes = nodes.map(node => node.SchedulingEligibility === 'eligible' ? node.ID : null).filter(i => i != null);

    // If all nodes are listed as ineligible then we can continue with scale-in
    if(!eligibleNodes.length){

      const params = {
        AutoScalingGroupName: NOMAND_CLIENT_IG, /* required */
        LifecycleActionResult: 'CONTINUE', /* required */
        LifecycleHookName: LIFECYCLE_HOOK, /* required */
      };

      autoScaling.completeLifecycleAction(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
      });

    }else{

      // If any node is still eligible, extend default 1 hr wait time for lifecycle hook
      const params = {
        AutoScalingGroupName: NOMAND_CLIENT_IG, /* required */
        LifecycleHookName: LIFECYCLE_HOOK, /* required */
      };

      autoScaling.recordLifecycleActionHeartbeat(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
      });

    }
  } catch (error) {
    console.log(error)
    response.statusCode = 400;
    response.body = JSON.stringify({
      message: 'Something went wrong, performing scale-in of nomad clients',
    }, null, 2);
  }


  return response;
}