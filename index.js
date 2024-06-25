"use strict";

const fs = require("fs");
const WebsocketCollabClient = require("./wcc");

/** @typedef { {sender: string, content: string, trusted: boolean, timestamp: number} } Message */

const config = JSON.parse(
    fs.readFileSync(__dirname + "\\config.json", { encoding: "utf8" })
);

const WS_URL = config["ws_url"];
const USER = config["username"];
const PASS = config["password"];
const CHANNEL_ID = config["room"];
const TARGET = config["target"];

let logger = {};
let held_msg = "";

let queue = "";
let queue_sender = "";

/** @type { WebsocketCollabClient? } */
let wcc = null;

/** @param { any } passed_logger */
exports.onLoad = (passed_logger) => {
    logger = passed_logger;
    logger.print("Loaded Collab plugin.");

    wcc = new WebsocketCollabClient();

    wcc.connect(WS_URL, CHANNEL_ID, {
        user: USER,
        pass: PASS,
    })
        .then(() => {
            logger.print("Initialized Collab WebSocket.");

            wcc.onTextMessage = (sender, content, json) => {
                logger.print("Received from:", sender, "msg:", content);
                queue = content;
                queue_sender = sender;
            };
        })
        .catch((reason) => {
            logger.warn("Could not connect to server:", reason);
        });
};

/**
 *
 * @returns { Message }
 */
exports.onInputQuery = () => {
    if (queue !== "") {
        let temp = queue;
        queue = "";
        return {
            content: temp.replace(/\r\n|\n/g, " ").trim(),
            sender: queue_sender,
            trusted: true,
            timestamp: new Date().getTime(),
        };
    }
    return undefined;
};

/**
 * @param { string } response
 */
exports.onResponse = (response) => {
    held_msg = response;
};

exports.onMainLoopEnd = () => {
    if (held_msg === "") return;
    wcc.sendText("Hilda", held_msg.trim(), [TARGET]);
    logger.print("Collab: sent:", held_msg);
    held_msg = "";
};

exports.onQuit = () => {
    if (wcc) {
        wcc.disconnect();
        wcc.removeAllListeners();
    }
    wcc = null;
};
