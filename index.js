require('es6-promise').polyfill();
let fetch = require('isomorphic-fetch');

let url = "http://3.135.219.25:4646/v1/nodes";

exports.handler =  function(event, context, callback) {
  let data = fetch(url)
	.then(function(response) {
		if (response.status >= 400) {
			throw new Error("Bad response from server");
		}
		return response.json();
	})
	.then(function(data) {
        console.log(data.ID);
        console.log(data.Name)
        return [data];
    }
    // this is wrong ??
    .then(function(data){
        let urlNomadStatus = "http://3.135.219.25:4646/v1/nodes/" + data.ID
        let urlNomadDrain = urlNomadStatus + "/drain";
        let urlListNomadAllocations = urlNomadStatus + "/allocations"
        let dataNameAWSEC2ID = data.Name

        let isSetToDrain = fetch(urlNomadDrain)
            // Check if running allocation
            .then(
                let listNomadAllocations = fetch(urlListNomadAllocations);
        
                if (listNomadAllocations.ClientStatus === "Running") {
                    // if running, extend default 1 hr wait time for lifecycle hook
                    var params = {
                        AutoScalingGroupName: jkgapr8_nomad_clients_asg, /* required */
                        LifecycleHookName: jkg_lifecycle_hook_terminate, /* required */
                        InstanceId: dataNameAWSEC2ID
                      };

                      autoscaling.recordLifecycleActionHeartbeat(params, function(err, data) {
                        if (err) console.log(err, err.stack); // an error occurred
                        else     console.log(data);           // successful response
                      });
                } else  {
                    // if not running, terminate with lifecycle hook - took out lifecycle action token? not sure how to use
                    // aws autoscaling complete-lifecycle-action --lifecycle-hook-name jkg_lifecycle_hook_terminate --auto-scaling-group-name jkgapr8_nomad_clients_asg --lifecycle-action-result ABANDON --instance-id dataNameAWSEC2ID
                    var params = {
                        AutoScalingGroupName: jkgapr8_nomad_clients_asg, /* required */
                        LifecycleActionResult: 'CONTINUE', /* required */
                        LifecycleHookName: jkg_lifecycle_hook_terminate, /* required */
                        InstanceId: dataNameAWSEC2ID
                      };
                      autoscaling.completeLifecycleAction(params, function(err, data) {
                        if (err) console.log(err, err.stack); // an error occurred
                        else     console.log(data);           // successful response
                      });
                }
    })
    );

const response = {
    statusCode: 200,
    body: JSON.stringify(data),
};
return response;
}


//End response should be "nomad client <node-id> terminated!"