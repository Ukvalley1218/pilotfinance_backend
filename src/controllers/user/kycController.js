
import { Student } from "../../models/student.model.js";

// --- 1. GET KYC STATUS & DATA ---
export const getKycStatus = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);

    if (!student)
      return res.status(404).json({ success: false, msg: "Student not found" });

    res.status(200).json({
      success: true,
      status: student.kycStatus,
      data: {
        ...(student.kycData || {}),
        kycProfile: student.kycProfile,
        dob: student.dob,
        country: student.country,
        state: student.state,
        phone: student.phone,
      },
    });
  } catch {
    res.status(500).json({ success: false, msg: "Server Error" });
  }
};


// --- 2. HANDLE PERSONAL INFO (Step 1) ---
export const updatePersonalInfo = async (req, res) => {
  try {
    const { dob, country, state, phone, uni, course, zipCode, pin1, pin2, pin3 } = req.body;

    const fullPin = pin1 && pin2 && pin3 ? `${pin1}-${pin2}-${pin3}` : zipCode;

    const updateFields = {
      dob,
      country,
      state,
      phone,
      uni,
      course,
      kycStatus: "Pending",
    };

    if (fullPin) updateFields.ssnPin = fullPin;

    const updatedStudent = await Student.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    );

    res.status(200).json({
      success: true,
      msg: "Personal info saved",
      data: updatedStudent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error during personal info update" });
  }
};


// --- 3. HANDLE DOCUMENTS & BANK DETAILS (Step 2) ---
export const submitKycDocuments = async (req, res) => {
  try {
    const {
      bankAccount,
      bankName,
      ifscCode,
      idType,
      documentType,
      addressState,
      addressCity,
      postalCode,
      addressDocType,
    } = req.body;

    const files = req.files;

    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ msg: "Student not found" });

    // 🔹 Update document-level files
    const updateDoc = (field) => {
      if (files?.[field]) {
        student.kycData[field] = {
          url: files[field][0].path,
          status: "Pending",
          remark: "",
          verifiedBy: null,
          verifiedAt: null,
        };
      }
    };

    ["front", "back", "idFront", "idBack", "selfie", "passbook", "loa", "addressProof"].forEach(updateDoc);

    // 🔹 Save general KYC profile data
   student.kycProfile = {
  ...student.kycProfile, // 🟢 KEEP OLD DATA
  bankAccount: bankAccount ?? student.kycProfile?.bankAccount,
  bankName: bankName ?? student.kycProfile?.bankName,
  ifscCode: ifscCode ?? student.kycProfile?.ifscCode,
  addressState: addressState ?? student.kycProfile?.addressState,
  addressCity: addressCity ?? student.kycProfile?.addressCity,
  postalCode: postalCode ?? student.kycProfile?.postalCode,
  addressDocType: addressDocType ?? student.kycProfile?.addressDocType,
  idType: idType ?? student.kycProfile?.idType,
  documentType: documentType ?? student.kycProfile?.documentType,
  submittedAt: new Date(),
};



    student.kycStatus = "Pending";

    await student.save();

    res.status(200).json({
      success: true,
      msg: "KYC documents uploaded successfully",
      documents: student.kycData,
    });
  } catch (err) {
    console.error("KYC Upload Error:", err);
    res.status(500).json({ msg: "Server Error during document upload" });
  }
};




// --- 4. HANDLE ADDRESS PROOF (Step 3) ---
export const submitAddressProof = async (req, res) => {
  try {
    const { country,state, city, postalCode, docType } = req.body;

    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ msg: "Student not found" });

    if (req.file) {
      student.kycData.addressProof = {
        url: req.file.path,
        status: "Pending",
        remark: "",
        verifiedBy: null,
        verifiedAt: null,
      };
    }

    // Save address metadata inside profile
    student.kycProfile = {
  ...(student.kycProfile || {}),
  addressCountry: country ?? student.kycProfile?.addressCountry,
  addressState: state ?? student.kycProfile?.addressState,
  addressCity: city ?? student.kycProfile?.addressCity,
  postalCode: postalCode ?? student.kycProfile?.postalCode,
  addressDocType: docType ?? student.kycProfile?.addressDocType,
};


    student.kycStatus = "Pending";
    student.country = country; // Update country if provided

    await student.save();

    res.status(200).json({
      success: true,
      msg: "Address proof uploaded successfully",
      documents: student.kycData.addressProof,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server Error during address proof" });
  }
};
