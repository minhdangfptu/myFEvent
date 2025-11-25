import multer from 'multer';

// Configure multer to store files in memory (you can change this to disk storage if needed)
const storage = multer.memoryStorage();

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only specific file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, XLS, PPT files are allowed.'), false);
    }
  }
});

// Middleware for handling multiple files
export const uploadFiles = upload.array('files', 10); // Allow up to 10 files

// Middleware for handling single file
export const uploadSingle = upload.single('file');

export default upload;






