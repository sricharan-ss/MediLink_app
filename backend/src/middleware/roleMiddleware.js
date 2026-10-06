const roleMiddleware = (allowedRoles = []) => {
	return async (req, res, next) => {
		try {
			if (!req.userId) {
				return res.status(401).json({
					status: 'UNAUTHORIZED',
					message: 'User not authenticated',
				});
			}

			const { prisma } = await import('../config/db.js');

			const user = await prisma.user.findUnique({
				where: { userId: req.userId },
				select: {
					superAdmin: { select: { superAdminId: true } },
					hospitalAdmin: { select: { adminId: true } },
					doctor: { select: { doctorId: true } },
					nurse: { select: { nurseId: true } },
					receptionist: { select: { receptionistId: true } },
					labManager: { select: { managerId: true } },
					inventoryManager: { select: { managerId: true } },
					patient: { select: { patientId: true } },
				},
			});

			if (!user) {
				return res.status(401).json({
					status: 'UNAUTHORIZED',
					message: 'User not found',
				});
			}

			const roles = [];
			if (user.superAdmin) roles.push('SUPER_ADMIN');
			if (user.hospitalAdmin) roles.push('HOSPITAL_ADMIN');
			if (user.doctor) roles.push('DOCTOR');
			if (user.nurse) roles.push('NURSE');
			if (user.receptionist) roles.push('RECEPTIONIST');
			if (user.labManager) roles.push('LAB_MANAGER');
			if (user.inventoryManager) roles.push('INVENTORY_MANAGER');
			if (user.patient) roles.push('PATIENT');

			req.userRoles = roles;

			if (allowedRoles.length === 0 || roles.some((role) => allowedRoles.includes(role))) {
				return next();
			}

			return res.status(403).json({
				status: 'FORBIDDEN',
				message: 'Access denied',
			});
		} catch (error) {
			return res.status(500).json({
				status: 'ERROR',
				message: 'Role verification failed',
			});
		}
	};
};

export default roleMiddleware;
