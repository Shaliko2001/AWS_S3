
import express from 'express';

import dotenv from 'dotenv';
dotenv.config();

import AWS from 'aws-sdk';
import fs from 'fs';
import multer from 'multer';
import mime from 'mime-types'
import multerS3 from 'multer-s3'




const app = express();
const port = process.env.PORT;

// AWS SDK configuration
AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });


const s3 = new AWS.S3();

// Multer configuration
const storage = multer.memoryStorage(); // Use memory storage to handle the file in memory
const upload = multer({ storage });

const uploadFileToS3 = (bucketName, fileKey, fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadParams = {
      Bucket: bucketName,
      Key: fileKey,
      Body: fileBuffer,
      
        };
    
    

    s3.upload(uploadParams, (err, data) => {
      if (err) {
        console.error('Error uploading the file:', err);
        reject(err);
      } else {
        console.log('File uploaded successfully:', data.Location);
        // Construct the URL
        const imageUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
        resolve(imageUrl);
      }
    });
  });
};
// const getImageUrlFromS3 = (bucketName, fileKey) => {
//     const imageUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
//     return imageUrl;
//   };
  


  app.get('/image/:fileKey', async (req, res) => {
    const bucketName = process.env.AWS_BUCKET_NAME;
    const fileKey = req.params.fileKey;
  
    try {
      const imageUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
  
      const params = {
        Bucket: bucketName,
        Key: fileKey,
      };
  
      s3.getObject(params, (err, data) => {
        if (err) {
          console.error('Error reading the file:', err);
          res.status(500).json({ error: 'Failed to fetch image from S3' });
        } else {
          const imageContent = data.Body;
          const contentType = mime.lookup(fileKey);
  
          console.log('Content Type:', contentType);
          res.set('Content-Type', contentType);
          res.send(imageContent);
        }
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to fetch image from S3' });
    }
  });
  
// POST request to upload an image
app.post('/upload', upload.single('image'), async (req, res) => {
    const bucketName = process.env.AWS_BUCKET_NAME; // Replace 'image-bucket-v1' with your actual S3 bucket name
  
    try {
      const fileBuffer = req.file.buffer;
      const fileKey = req.file.originalname;
      const imageUrl = await uploadFileToS3(bucketName, fileKey, fileBuffer);
      res.status(200).json({ message: 'Image upload successful', imageUrl });
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload the file' });
    }
  });

// DELETE request to delete an image or video from S3
app.delete('/delete/:fileKey', async (req, res) => {
  const bucketName = process.env.AWS_BUCKET_NAME;
  const fileKey = req.params.fileKey;

  try {
    const params = {
      Bucket: bucketName,
      Key: fileKey,
    };

    s3.deleteObject(params, (err, data) => {
      if (err) {
        console.error('Error deleting the file:', err);
        res.status(500).json({ error: 'Failed to delete the file from S3' });
      } else {
        console.log('File deleted successfully');
        res.status(200).json({ message: 'File deleted successfully' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete the file from S3' });
  }
});


// PUT request to update an image or video in S3
app.put('/update/:fileKey', upload.single('updatedFile'), async (req, res) => {
  const bucketName = process.env.AWS_BUCKET_NAME;
  const fileKey = req.params.fileKey;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No updated file provided.' });
    }

    const fileBuffer = req.file.buffer;
    const updatedFileKey = req.file.originalname;

    // Delete the existing object from S3
    const deleteParams = {
      Bucket: bucketName,
      Key: fileKey,
    };

    s3.deleteObject(deleteParams, (deleteErr, deleteData) => {
      if (deleteErr) {
        console.error('Error deleting the existing file:', deleteErr);
        res.status(500).json({ error: 'Failed to update the file in S3' });
      } else {
        console.log('Existing file deleted successfully');

        // Upload the updated file to S3
        uploadFileToS3(bucketName, updatedFileKey, fileBuffer)
          .then((imageUrl) => {
            res.status(200).json({ message: 'File updated successfully', imageUrl });
          })
          .catch((uploadErr) => {
            console.error('Error uploading the updated file:', uploadErr);
            res.status(500).json({ error: 'Failed to update the file in S3' });
          });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update the file in S3' });
  }
});


// upload videos >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>.



const uploadVideo = multer({
  storage: multerS3({
    s3: s3,
    bucket:process.env.AWS_BUCKET_NAME,
    acl: 'public-read', // Optional: Sets the permissions for the uploaded video (public-read means it's accessible to everyone)
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, 'videos/' + file.originalname); // Upload the file to the 'videos' directory in the S3 bucket
    }
  })
});

// Route to handle the video upload
app.post('/upload', uploadVideo.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No video file provided.' });
  }

  res.json({ message: 'Video uploaded successfully.', url: req.file.location });
});



  
  
  // GET request to retrieve an image by URL

  
  app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
  });



