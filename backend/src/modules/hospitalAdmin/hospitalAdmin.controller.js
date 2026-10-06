import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const linkDoctorToHospital = async (req, res) => {
  const licenseNo = req.body?.licenseNo;
  if (!licenseNo) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Input',
      error: 'licenseNo not found',
    });
  }
  const doctor = await prisma.doctor.findUnique({
    where: {
      licenseNo,
    },
    select: {
      doctorId: true,
    },
  });
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'doctor not found in the database',
    });
  }
  const adminId = req.adminId;
  const adminHospital = await prisma.hospitalAdmin.findUnique({
    where: {
      adminId,
    },
    select: {
      hospitalId: true,
    },
  });
  if (!adminHospital || !adminHospital.hospitalId) {
    return res.status(400).json({
      success: false,
      message: 'admin does not have hospital',
    });
  }
  // hospital id and docid many to many
  await prisma.doctorHospital.create({
    data: {
      doctorId: doctor.doctorId,
      hospitalId: adminHospital.hospitalId,
    },
  });
  return res.json({
    success: true,
    message: 'doctor added to hospital successfully',
    doctor: licenseNo,
  });
};

export const linkNurseWithHospital = async (req, res) => {
  const nurseId = req.body?.nurseId;
  const adminId = req.adminId;
  if (!nurseId) {
    return res.status(400).json({
      success: false,
      message: 'nurse id not found',
    });
  }
  const adminHospital = await prisma.hospitalAdmin.findUnique({
    where: {
      adminId,
    },
    select: {
      hospitalId: true,
    },
  });
  if (!adminHospital || !adminHospital.hospitalId) {
    return res.status(400).json({
      success: false,
      message: 'admin does not have hospital',
    });
  }
  const nurse = await prisma.nurse.findUnique({
    where: {
      nurseId,
    },
  });
  if (!nurse) {
    return res.status(400).json({
      success: false,
      message: 'nurse not found',
    });
  }
  await prisma.nurse.update({
    where: {
      nurseId: nurseId,
    },
    data: {
      hospitalId: adminHospital.hospitalId,
    },
  });
  return res.json({
    success: true,
    message: 'nurse added to the hospital',
  });
};

export const linkLabManagerWithHospital = async (req, res) => {
  const LabManagerId = req.body?.labManagerId;
  const adminId = req.adminId;
  if (!LabManagerId) {
    return res.status(400).json({
      success: false,
      message: 'labManager id not found',
    });
  }
  const adminHospital = await prisma.hospitalAdmin.findUnique({
    where: {
      adminId,
    },
    select: {
      hospitalId: true,
    },
  });
  if (!adminHospital || !adminHospital.hospitalId) {
    return res.status(400).json({
      success: false,
      message: 'admin does not have hospital',
    });
  }
  const LabManager = await prisma.labManager.findUnique({
    where: {
      managerId: LabManagerId,
    },
  });
  if (!LabManager) {
    return res.status(400).json({
      success: false,
      message: 'LabManager not found',
    });
  }
  await prisma.labManager.update({
    where: {
      managerId: LabManagerId,
    },
    data: {
      hospitalId: adminHospital.hospitalId,
    },
  });
  return res.json({
    success: true,
    message: 'LabManager added to the hospital',
  });
};
export const linkInventoryManagerWithHospital = async (req, res) => {
  const InventoryManagerId = req.body?.inventoryManagerId;
  const adminId = req.adminId;
  if (!InventoryManagerId) {
    return res.status(400).json({
      success: false,
      message: 'inventoryManager id not found',
    });
  }
  const adminHospital = await prisma.hospitalAdmin.findUnique({
    where: {
      adminId,
    },
    select: {
      hospitalId: true,
    },
  });
  if (!adminHospital || !adminHospital.hospitalId) {
    return res.status(400).json({
      success: false,
      message: 'admin does not have hospital',
    });
  }
  const InventoryManager = await prisma.inventoryManager.findUnique({
    where: {
      managerId: InventoryManagerId,
    },
  });
  if (!InventoryManager) {
    return res.status(400).json({
      success: false,
      message: 'InventoryManager not found',
    });
  }
  await prisma.inventoryManager.update({
    where: {
      managerId: InventoryManagerId,
    },
    data: {
      hospitalId: adminHospital.hospitalId,
    },
  });
  return res.json({
    success: true,
    message: 'InventoryManager added to the hospital',
  });
};
export const linkReceptionistWithHospital = async (req, res) => {
  const ReceptionistId = req.body?.receptionistId;
  const adminId = req.adminId;
  if (!ReceptionistId) {
    return res.status(400).json({
      success: false,
      message: 'receptionist id not found',
    });
  }
  const adminHospital = await prisma.hospitalAdmin.findUnique({
    where: {
      adminId,
    },
    select: {
      hospitalId: true,
    },
  });
  if (!adminHospital || !adminHospital.hospitalId) {
    return res.status(400).json({
      success: false,
      message: 'admin does not have hospital',
    });
  }
  const Receptionist = await prisma.receptionist.findUnique({
    where: {
      receptionistId: ReceptionistId,
    },
  });
  if (!Receptionist) {
    return res.status(400).json({
      success: false,
      message: 'Receptionist not found',
    });
  }
  await prisma.receptionist.update({
    where: {
      receptionistId: ReceptionistId,
    },
    data: {
      hospitalId: adminHospital.hospitalId,
    },
  });
  return res.json({
    success: true,
    message: 'Receptionist added to the hospital',
  });
};

export const viewRequest = async (req, res) => {
  const adminId = req.adminId;
  const adminData = await prisma.hospitalAdmin.findUnique({
    where: {
      adminId,
    },
    select: {
      adminId: true,
      hospital: {
        select: {
          adminRequests: true,
        },
      },
    },
  });
  if (!adminData.hospital) {
    return res.status(400).json({
      success: false,
      message: 'admin does not have a hospital',
    });
  }
  res.json({
    success: true,
    requests: adminData.hospital.adminRequests,
  });
};

// only for staff members nurse receptionist lab manager and inventory manager
export const createRequest = async (req, res) => {
  const userId = req.userId;
  const hospitalId = req.body?.hospitalId;
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      doctor: {
        select: {
          doctorId: true,
        },
      },
      nurse: {
        select: {
          nurseId: true,
        },
      },
      receptionist: {
        select: {
          receptionistId: true,
        },
      },
      labManager: {
        select: {
          managerId: true,
        },
      },
      inventoryManager: {
        select: {
          managerId: true,
        },
      },
    },
  });
  if (!user) {
    return res.status(400).json({ success: false, message: 'user not found' });
  }
  if (!hospitalId) {
    return res
      .status(400)
      .json({ success: false, message: 'hospital id not found' });
  }
  const hospital = await prisma.hospital.findUnique({
    where: {
      hospitalId,
    },
    select: {
      hospitalId: true,
      name: true,
    },
  });
  if (!hospital) {
    return res
      .status(400)
      .json({ success: false, message: 'hospital not found' });
  }
  if (user.nurse) {
    await prisma.adminRequest.create({
      data: {
        role: 'nurse',
        roleId: user.nurse.nurseId,
        hospitalId,
      },
    });
    return res.status(201).json({
      success: true,
      message: `nurse request added to hospital ${hospital.name}`,
    });
  }

  if (user.receptionist) {
    await prisma.adminRequest.create({
      data: {
        role: 'receptionist',
        roleId: user.receptionist.receptionistId,
        hospitalId,
      },
    });
    return res.status(201).json({
      success: true,
      message: `receptionist request added to hospital ${hospital.name}`,
    });
  }

  if (user.labManager) {
    await prisma.adminRequest.create({
      data: {
        role: 'labManager',
        roleId: user.labManager.managerId,
        hospitalId,
      },
    });
    return res.status(201).json({
      success: true,
      message: `labManager request added to hospital ${hospital.name}`,
    });
  }

  if (user.inventoryManager) {
    await prisma.adminRequest.create({
      data: {
        role: 'inventoryManager',
        roleId: user.inventoryManager.managerId,
        hospitalId,
      },
    });
    return res.status(201).json({
      success: true,
      message: `inventoryManager request added to hospital ${hospital.name}`,
    });
  }

  return res.status(400).json({
    success: false,
    message: 'user is not a staff member',
  });
};
