const fs=require('fs');
const path=require('path');
const { validationResult } = require('express-validator/check');

const io=require('../socket');
const Post=require('../models/post');
const User=require('../models/user');
exports.getPosts=async (req,res,next)=>{
     const currentPage=req.query.page || 1;
     const perPage=2;
     //let totalItems;
     try{
     const totalItems = await Post.find().countDocuments()
     //.then(count=>{
        // totalItems=count;
         //return 
 const posts= await Post.find().populate('creator').sort({createdAt: -1})
         .skip((currentPage -1)* perPage).limit(perPage);                
    //  })
    //  .then(posts=>{
        res.status(200).json({message:"Posts Fetched",
            posts:posts,
            totalItems:totalItems
        });
    }catch(err){
        if(!err.stausCode){
                    err.statusCode=500;
              }
              next(err);
    }
//     //  .catch(err=>{ if(!err.stausCode){
//     //     err.statusCode=500;
//   }
//   next(err);
//    });
  

    



};
exports.createPost=(req,res,next)=>{
    const errors=validationResult(req);
    if(!errors.isEmpty()){
         const error=new Error('Validation failed, entered data is incorrect');
             error.statuscode=422;
             throw error;
        // return res.status(422).json({
        //     message:'Validation Failed, entered data is incorrect',errors:errors.array()

        // });
    }
    //Create post in db
    if(!req.file){
        const error=new Error('No image provided');error.stausCode=422;
        throw error;
    }
    const imageUrl=req.file.path;
    const title=req.body.title;
    const content=req.body.content;
    let creator;
    const post=new Post({
        title:title,
        imageUrl:imageUrl,
        content:content,
        creator:req.userId
    });
    post.save()
    .then(result=>{
        console.log(result);
        return User.findById(req.userId)})
        .then(user=>{
            creator=user;
            user.posts.push(post);
            return user.save();})
            .then((result)=>{
                io.getIO().emit('posts',{action:'create',post:{...post._doc,creator:{_id:req.user._id,name:user.name}}});
        res.status(201).json({
            message:"Post created Successfully",
            post:post,
            creator:{_id:creator._id,name:creator.name}
        });

    })
    .catch(err=>{
           if(!err.stausCode){
                 err.statusCode=500;
           }
           next(err);
        // console.log(err);
    });
    
};

exports.getPost=(req,res,next)=>{
 
   const postId=req.params.postId;
   Post.findById(postId)
   .then(post=>{
       if(!post){
           const error=new Error('Could not find post.');
           error.stausCode=404;
           throw error;//we''ll end up in catch block from where we exec. next(err) and reach the error handling middleware ;
       }
       res.status(200).json({
           message:"Post Fetched",
           post:post
       });
   })
   .catch(err=>{
    if(!err.stausCode){
        err.statusCode=500;
  }
  next(err);
   }); 


};

exports.updatePost=(req,res,next)=>{
    
    const postId=req.params.postId;

    const errors=validationResult(req);
    if(!errors.isEmpty()){
         const error=new Error('Validation failed, entered data is incorrect');
             error.statuscode=422;
             throw error;}
    const title=req.body.title;
    const content=req.body.content;
    let imageUrl=req.body.image;
    if(req.file)
    {
        imageUrl=req.file.path;
    }
    if(!imageUrl)
    {
        
        const error=new Error("No File Picked");
        error.statusCode=422;
        throw error;
    }
    Post.findById(postId).populate('creator')
    .then(post=>{
       
        if(!post){
            const error=new Error('Could not find post.');
            error.stausCode=404;
            throw error;//we''ll end up in catch block from where we exec. next(err) and reach the error handling middleware ;
        }
        if(post.creator._id.toString() !== req.userId )
        {
            const error=new Error('Not Authorized');
            error.statusCode=403;
            throw error;
        }
        if(imageUrl!==post.imageUrl)
        {
            clearImage(post.imageUrl);
        }
        post.title=title;
        post.content=content;
        post.imageUrl=imageUrl
        return post.save();
    })
    .then(result=>{
        io.getIO().emit('posts',{action:'update',post:result});
        res.status(200).json({
            message:'Post Updated!',
            post:result
        });
    })
    .catch(err=>{
        console.log(err);
        if(!err.stausCode){
            err.statusCode=500;
      }
      next(err);
       }); 
      
};
exports.deletePost=(req,res,next)=>{
    const postId=req.params.postId;
    Post.findById(postId)
    .then(post=>{
        if(!post){
            const error=new Error('Could not find post.');
            error.stausCode=404;
            throw error;//we''ll end up in catch block from where we exec. next(err) and reach the error handling middleware ;
        }
        if(post.creator.toString() !== req.userId )
        {
            const error=new Error('Not Authorized');
            error.statusCode=403;
            throw error;
        }
        clearImage(post.imageUrl);
        return Post.findByIdAndRemove(postId);
    })
    .then(result=>{
        return User.findById(req.userId)})
        .then(user=>{
          user.posts.pull(postId);
          return user.save();})
          .then(result=>{      
         io.getIO().emit('posts',{action:'delete',post:postId});
        console.log(result);
        res.status(200).json({message:'Deleted Post.'});

    })
    .catch(err=>{
        console.log(err);
        if(!err.stausCode){
            err.statusCode=500;
      }
      next(err);
       });
}

const clearImage=filePath=>{
    filePath=path.join(__dirname,'..',filePath);
    fs.unlink(filePath,err=>console.log(err));

}
