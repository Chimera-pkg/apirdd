import express from "express";
import { latestConn, latestSpeed } from "../controller/Connections.js";
import { refreshToken } from "../controller/refreshToken.js";
import { addTask, allTask, deleteTask, editTask, LaunchMission } from "../controller/Tasks.js";
import { getUsers, Register, Login, Logout, VideoStream } from "../controller/Users.js";
import { addWaypoint, deleteWaypoints, editWaypoints, getWaypoints } from "../controller/Waypoints.js";
import { verifyToken } from "../middleware/verifyToken.js";

const routerModel = express.Router();

routerModel.get('/users',verifyToken, getUsers);
routerModel.post('/users', Register);
routerModel.post('/login', Login);
routerModel.get('/token' ,refreshToken);
routerModel.get('/video' ,VideoStream);
routerModel.delete('/logout', Logout);

routerModel.get('/task', allTask);
routerModel.post('/task', addTask);
routerModel.patch('/task/:id_task', editTask);
routerModel.delete('/task/:id_task', deleteTask);
routerModel.post('/launch', LaunchMission);

routerModel.get('/connection', latestConn);
routerModel.get('/speed', latestSpeed);

routerModel.get('/waypoints', getWaypoints);
routerModel.post('/waypoints', addWaypoint);
routerModel.patch('/waypoints/:id', editWaypoints);
routerModel.delete('/waypoints/:id', deleteWaypoints);

export default routerModel;
