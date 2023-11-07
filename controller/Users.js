import Users from "../models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import http from "http";

export const getUsers = async(req, res) => {
    try {
        const user = await Users.findAll({
            attributes: ['id','name','email']
        });
        res.json(user);
    } catch (error) {
        console.log(error)
    }
}

export const Register = async(req, res) =>{
    const { name, email, password, confPassword} = req.body;
    if(password !== confPassword) return res.status(400).json({msg: "Password and Confirm Password do not matched!"});
    
    try {
	const existingUser = await Users.findOne({ 
		where: {email: email }	
	});
        if (existingUser!=null) {
          return res.status(399).json({msg: "Email Already Registered!"});
        }

        const salt = await bcrypt.genSalt();
        const hashPassword = await bcrypt.hash(password, salt);

        await Users.create({
            name: name,
            email: email,
            password: hashPassword
        });

        res.json({msg: "Register berhasil"});
    } catch (error) {
        console.log(error);
    }
}

export const Login = async(req, res) =>{
    try {
        const user = await Users.findAll({
            where:{
                email: req.body.email
            }
        });

        const match = await bcrypt.compare(req.body.password, user[0].password);
        if(!match) return res.status(400).json({msg: "Incorrect Password"});

        const userId = user[0].id;
        const name = user[0].name;
        const email = user[0].email;
        
        const accessToken = jwt.sign({userId, name, email}, process.env.ACCESS_TOKEN_SECRET, {
        // const accessToken = jwt.sign({userId, name, email}, 'iebdiebr3iurbif8wb3bf38fb38', {
        expiresIn: '1d'    
        });
        
        const refreshToken = jwt.sign({userId, name, email}, process.env.REFRESH_TOKEN_SECRET, {
        // const refreshToken = jwt.sign({userId, name, email}, 'iuh3fuihfibsifb38f3bf3b920', {
            expiresIn: '1d'
        });

        await Users.update({refresh_token: refreshToken}, {
            where:{
                id: userId
            }
        });
	res.header('Access-Control-Allow-Origin', "http://localhost:3000");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	res.header( 'Access-Control-Allow-Credentials',true);
    
    // res.status(200).json({ msg: "signing you in" });
    console.log('user_id : ',userId);
    console.log('name : ',name);
    console.log('email : ', email)
        
    // res.cookie('refreshToken', refreshToken, {
    //     httpOnly: true,
    //     maxAge: 24 * 60 * 60 * 1000,
    //     sameSite: 'none',
    //     secure: true,
    // });

    res.status(201).json({ accessToken });
         
    } catch (error) {
        res.status(404).json({msg:"Incorrect Email Address"})
    }
}

export const Logout = async(req, res) =>{
    const refreshToken = req.cookies.refreshToken;
        if(!refreshToken) return res.sendStatus(204);
        const user = await Users.findAll({
            res:{
                refresh_token: refreshToken
            }
        });

        if(!user[0]) return res.sendStatus(204);

        const userId = user[0].id;

        await Users.update({refresh_token: null},{
            where:{
                id: userId
            }
        });

        res.clearCookie('refreshToken');
        return res.sendStatus(200);
}

export const VideoStream = async(req, res) =>{
    const options = {
    hostname: 'stream.astranaux.tech',
    port: 80,
    path: '/video_feed',
    method: 'GET'
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    console.error(err);
    res.status(500).send('Error streaming video');
  });
  proxyReq.end();
}
