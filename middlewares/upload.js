const multer = require("multer");
const path = require("path");

// Profile image filter (JPEG and PNG only)
const profileImageFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpg", "image/jpeg", "image/png"];
  const mimeType = allowedTypes.includes(file.mimetype);
  const extname = allowedTypes.some((type) =>
    path.extname(file.originalname).toLowerCase().includes(type.split("/")[1])
  );

  if (mimeType && extname) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type for ${file.fieldname}. Only JPG, JPEG and PNG are allowed.`
      )
    );
  }
};

// Document filter (PDF only)
const documentFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type for documents. Only PDF is allowed."));
  }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Dynamically handle validation based on the fieldname
    if (file.fieldname === "profile") {
      profileImageFilter(req, file, cb, file.fieldname); // Validate profile image
    } else if (file.fieldname === "signature") {
      profileImageFilter(req, file, cb, file.fieldname);
    } else if (file.fieldname === "prescription") {
      profileImageFilter(req, file, cb, file.fieldname);
    } else if (file.fieldname === "paymentQr") {
      profileImageFilter(req, file, cb, file.fieldname);
    } else if (file.fieldname === "documents[]") {
      documentFilter(req, file, cb); // Validate documents (PDFs)
    } else {
      cb(new Error("Invalid file field"));
    }
  },
});

module.exports = {
  upload,
};
