const User=require('../models/user');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {validationResult}=require('express-validator/check');
exports.signup=(req,res,next)=>{
         const errors=validationResult(req);
         if(!errors.isEmpty()){
             const error=new Error('Validation failed');
             error.statusCode=422;
             error.data=errors.array();
             throw error;         
         }
         const email=req.body.email;
         const name=req.body.name;
         const password=req.body.password;
         bcrypt.hash(password,12)
         .then(hashedPassword=>{
             const user=new User({
                 email:email,
                 password:hashedPassword,
                 name:name
             });
             return user.save();
         })
         .then(result=>{
             res.status(201).json({message:'SignUp Successful',userId:result._id});
         })
         .catch(err=>{
            if(!err.stausCode){
                  err.statusCode=500;
            }
            next(err);
         // console.log(err);
     });
};

exports.login=(req,res,next)=>{
      const email=req.body.email;
      const password=req.body.password;
      let loadedUser;
      User.findOne({email:email})
      .then(user=>{
          if(!user)
          {
              const error=new Error('User could not found');
              error.stausCode=401;
              throw error;
          }
          loadedUser=user;
          return bcrypt.compare(password,user.password);
          
      })
      .then(isEqual=>{
          if(!isEqual)
          {
              const error=new Error('wrong Password');
              error.stausCode=401;
              throw error;
          }
          const token=jwt.sign({email:loadedUser.email,
          userId:loadedUser._id.toString()
         },'somesupersecretsecret',{expiresIn:'1h'});
         res.status(200).json({token:token, userId:loadedUser._id.toString()});

      })
      .catch(err=>{
        if(!err.stausCode){
              err.statusCode=500;
        }
        next(err);
     // console.log(err);
 } );
       
};

exports.getStatus=(req,res,next)=>{
    User.findById(req.userId)
    .then(user=>{
        if(!user)
        {
            const error=new Error("No user found");
            error.statusCode=401;
            throw error;
        }
        const status=user.status;
        res.status(200).json({message:"Status fetched", status:status});
    })
    .catch(err=>{
        console.log(err);
        if(!err.stausCode){
            err.statusCode=500;
      }
      next(err);
       });
}
exports.updateStatus=(req,res,next)=>{
    const status=req.body.status;
    User.findById(req.userId)
    .then(user=>{
        if(!user)
        {
            const error=new Error("No user found");
            error.statusCode=401;
            throw error;
        }
        user.status=status;
        return user.save();
    })
    .then(result=>{
        res.status(200).json({message:'Status Updated'});
    })
    .catch(err=>{
        console.log(err);
        if(!err.stausCode){
            err.statusCode=500;
      }
      next(err);
       });
};