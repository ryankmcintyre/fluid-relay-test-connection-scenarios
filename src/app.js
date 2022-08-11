/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { SharedMap } from "fluid-framework";
import { AzureClient } from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils"

// The config is set to run against a local service by default.
// const serviceConfig = {
//     connection: {
//         type: "local",
//         tokenProvider: new InsecureTokenProvider("" , { id: "userId" }),
//         endpoint: "http://localhost:7070",
//     }
// };


/** 
 * To connect to an Azure Fluid Relay tenant comment out the local serviceConfig above and uncomment the serviceConfig below.
 * Update the corresponding properties below with your tenant specific information to run against your tenant.
 */ 
const serviceConfig = {
    connection: {
        type: "remote",
        tenantId: "", // REPLACE WITH YOUR TENANT ID
        tokenProvider: new InsecureTokenProvider("" /* REPLACE WITH YOUR PRIMARY KEY */, { id: "userId" }),
        endpoint: "", // REPLACE WITH YOUR AZURE ENDPOINT
    }
};

const client = new AzureClient(serviceConfig);

const diceValueKey = "dice-value-key";


const containerSchema = {
    initialObjects: { diceMap: SharedMap }
};
const root = document.getElementById("content");

function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
 }

const createNewDice = async () => {
    console.log("Getting/creating the container.");
    const { container, services } = await client.createContainer(containerSchema);
    //const { container } = await client.getContainer("794d7f68-7c34-4dce-934f-04c55f38c6b1", containerSchema);
    console.log("Received container.");

    container.initialObjects.diceMap.set(diceValueKey, 1);
    console.log("Begin attach to the container.");
    const id = await container.attach();
    console.log("Attached to the container.");

    // Inspecting the delay between createContainer and getMyself returning a value
    const audience = services.audience;
    let nowDate = new Date();
    // console.log(`Audience = ${ audience }`);
    var myself = await audience.getMyself();
    console.log(`Initial connectionState: ${container.connectionState}`);
    console.log(`Initial getMyself() ${nowDate.toTimeString()} (${ nowDate.getMilliseconds() }ms): ${ myself }`);
    // while (!myself) {
    //     console.log(`Looping`);
    //     await sleep(100)
    //     myself = await audience.getMyself()
    // }
    // nowDate = new Date();
    // let userId = myself.userId;
    // console.log(`Final getMyself() ${nowDate.toTimeString()} (${ nowDate.getMilliseconds() }ms): ${ myself }`);

    //console.log(`Initial container connection State: ${container.connectionState}`);
    // container.on("connected", async function(){
    //     console.log(`Container connected. Connection State: ${container.connectionState}`);
    //     nowDate = new Date();
    //     console.log(`Container connected time ${nowDate.toTimeString()} (${ nowDate.getMilliseconds() }ms)`);
    //     myself = await audience.getMyself();
    //     while (!myself) {
    //         console.log(`Looping`);
    //         myself = await audience.getMyself()
    //         await sleep(100)
    //     }
    //     nowDate = new Date();
    //     console.log(`Final getMyself() ${nowDate.toTimeString()} (${ nowDate.getMilliseconds() }ms): ${ myself }`);

    // });    
    const fluidContainerConnectTimeoutInMillisecs = 5000;
    const waitRecheckIntervalInMillisecs = 100;

    // Plain delay
    // try {
    //     await wait(fluidContainerConnectTimeoutInMillisecs, () => {
    //         const nowDate = new Date();
    //         console.log(`[${nowDate.toTimeString()} (${nowDate.getMilliseconds()})] client1 1st disconnect wait...`);
    //         // continue to wait for timeout
    //         return true;
    //     }, waitRecheckIntervalInMillisecs);
    // } catch (ex) {
    //     console.warn("didn't work");
    // }

    // Connection state
    // try {
    //     await wait(fluidContainerConnectTimeoutInMillisecs, () => {
    //         const nowDate = new Date();
    //         console.log(`[${nowDate.toTimeString()} (${nowDate.getMilliseconds()})] client1 1st disconnect wait...`);
    //         if (container.connectionState === 2) { // ConnectionState.Connected in @fluidframework/container-definitions
    //             console.debug(`Fluid container connected during wait, connectionState: ${container.connectionState}`);
    //             return false; // stop waiting
    //         }
    //         // continue to wait to either condition gets re-evaluated, or we timeout
    //         return true;
    //     }, waitRecheckIntervalInMillisecs);
    // } catch (ex) {
    //     console.warn("didn't work");
    // }

    // Myself Check
    try {
        await wait(fluidContainerConnectTimeoutInMillisecs, () => {
            const nowDate = new Date();
            console.log(`[${nowDate.toTimeString()} (${nowDate.getMilliseconds()})] client1 1st disconnect wait...`);
            const myself = audience.getMyself();
            if (myself) { // ConnectionState.Connected in @fluidframework/container-definitions
                console.debug(`Fluid container connected during wait, connectionState: ${container.connectionState}`);
                return false; // stop waiting
            }
            // continue to wait to either condition gets re-evaluated, or we timeout
            return true;
        }, waitRecheckIntervalInMillisecs);
    } catch (ex) {
        console.warn("didn't work");
    }
    
    console.log(`Final getMyself() ${nowDate.toTimeString()} (${ nowDate.getMilliseconds() }ms): ${ audience.getMyself() }`);
    console.log(`Final connectionState: ${container.connectionState}`);

    renderDiceRoller(container.initialObjects.diceMap, root);
}

const wait = (timeoutInMilliseconds, waitConditionFunc, interval = 50) => {
    const date = new Date();
    if (timeoutInMilliseconds > 0) {
        date.setMilliseconds(date.getMilliseconds() + timeoutInMilliseconds);
    }
    return new Promise((resolve, reject) => {
        if (!waitConditionFunc || !waitConditionFunc()) {
            //if there is no condition, or after checking the condition, we don't need to wait, resolve
            resolve("");
        }

        //check the condition on intervals until the condition indicates that we don't need to wait, or time out
        // provided condition function needs to return false to indicate to not wait anymore, or true to continue to wait
        let intervalId = setInterval(() => {
            if (!waitConditionFunc || !waitConditionFunc()) {
                //if there is no condition, or after checking the condition, we don't need to wait, resolve
                clearInterval(intervalId);
                resolve("");
            }
            if (timeoutInMilliseconds > 0 && (new Date()) >= date) {
                //time out
                clearInterval(intervalId);
                reject("timeout");
            }
        }, interval);
    });
}

const loadExistingDice = async (id) => {
    const { container, services } = await client.getContainer(id, containerSchema);
    
    // Inspecting the delay between createContainer and getMyself returning a value
    const audience = services.audience;
    let nowDate = new Date();
    console.log(`Existing: Initial getMyself() ${nowDate.toTimeString()} (${ nowDate.getMilliseconds() }ms): ${audience.getMyself()}`);
    var myself = await audience.getMyself();
    while (!myself) {
        console.log(`Looping audience`);
        await sleep(100)
        myself = await audience.getMyself()
    }
    nowDate = new Date();
    console.log(`Existing: Final getMyself() ${nowDate.toTimeString()} (${ nowDate.getMilliseconds() }ms)`);
    
    renderDiceRoller(container.initialObjects.diceMap, root);
}

async function start() {
    if (location.hash) {
        await loadExistingDice(location.hash.substring(1))
    } else {
        const id = await createNewDice();
        location.hash = id;
    }
}

start().catch((error) => console.error(error));

// Define the view

const template = document.createElement("template");

template.innerHTML = `
  <style>
    .wrapper { text-align: center }
    .dice { font-size: 200px }
    .roll { font-size: 50px;}
  </style>
  <div class="wrapper">
    <div class="dice"></div>
    <button class="roll"> Roll </button>
  </div>
`

const renderDiceRoller = (diceMap, elem) => {
    elem.appendChild(template.content.cloneNode(true));

    const rollButton = elem.querySelector(".roll");
    const dice = elem.querySelector(".dice");

    // Set the value at our dataKey with a random number between 1 and 6.
    rollButton.onclick = () => diceMap.set(diceValueKey, Math.floor(Math.random() * 6) + 1);

    // Get the current value of the shared data to update the view whenever it changes.
    const updateDice = () => {
        const diceValue = diceMap.get(diceValueKey);
        // Unicode 0x2680-0x2685 are the sides of a dice (⚀⚁⚂⚃⚄⚅)
        dice.textContent = String.fromCodePoint(0x267f + diceValue);
        dice.style.color = `hsl(${diceValue * 60}, 70%, 30%)`;
    };
    updateDice();

    // Use the changed event to trigger the rerender whenever the value changes.
    diceMap.on("valueChanged", updateDice);
}