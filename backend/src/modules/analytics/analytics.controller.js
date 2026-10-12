import { prisma } from '../../config/db.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    let hospitalFilter = undefined;

    // If HOSPITAL_ADMIN without SUPER_ADMIN role, scope to their hospital
    if (
      req.userRoles &&
      req.userRoles.includes('HOSPITAL_ADMIN') &&
      !req.userRoles.includes('SUPER_ADMIN')
    ) {
      const admin = await prisma.hospitalAdmin.findUnique({
        where: { userId: req.userId },
        select: { hospitalId: true },
      });
      if (admin?.hospitalId) {
        hospitalFilter = admin.hospitalId;
      }
    }

    const encounterWhere = hospitalFilter ? { hospitalId: hospitalFilter } : {};
    const invoiceWhere = hospitalFilter ? { hospitalId: hospitalFilter } : {};
    const doctorWhere = hospitalFilter ? { hospitals: { some: { hospitalId: hospitalFilter } } } : {};

    const [
      totalPatients,
      totalDoctors,
      totalHospitals,
      totalAppointments,
      upcomingAppointments,
      completedAppointments,
      cancelledAppointments,
      totalInvoices,
      paidInvoicesCount,
      pendingInvoicesCount,
      paidRevenueAgg,
      pendingRevenueAgg,
      appointmentStatusGroups,
      invoiceStatusGroups,
      recentAppointments,
      recentPayments,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.doctor.count({ where: doctorWhere }),
      hospitalFilter ? 1 : prisma.hospital.count(),
      prisma.encounter.count({ where: encounterWhere }),
      prisma.encounter.count({
        where: {
          ...encounterWhere,
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      }),
      prisma.encounter.count({
        where: {
          ...encounterWhere,
          status: 'COMPLETED',
        },
      }),
      prisma.encounter.count({
        where: {
          ...encounterWhere,
          status: { in: ['CANCELLED', 'NO_SHOW'] },
        },
      }),
      prisma.invoice.count({ where: invoiceWhere }),
      prisma.invoice.count({
        where: {
          ...invoiceWhere,
          status: 'PAID',
        },
      }),
      prisma.invoice.count({
        where: {
          ...invoiceWhere,
          status: 'PENDING',
        },
      }),
      prisma.invoice.aggregate({
        where: {
          ...invoiceWhere,
          status: 'PAID',
        },
        _sum: { finalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          ...invoiceWhere,
          status: 'PENDING',
        },
        _sum: { finalAmount: true },
      }),
      prisma.encounter.groupBy({
        by: ['status'],
        where: encounterWhere,
        _count: { encounterId: true },
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: invoiceWhere,
        _count: { invoiceId: true },
        _sum: { finalAmount: true },
      }),
      prisma.encounter.findMany({
        where: encounterWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: {
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          patient: {
            include: {
              user: {
                select: { firstName: true, lastName: true, phoneNumber: true },
              },
            },
          },
          hospital: {
            select: { name: true, city: true },
          },
        },
      }),
      prisma.payment.findMany({
        where: hospitalFilter
          ? { invoice: { hospitalId: hospitalFilter } }
          : {},
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: {
            include: {
              patient: {
                include: {
                  user: {
                    select: { firstName: true, lastName: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const paidRevenue = Number(paidRevenueAgg._sum.finalAmount || 0);
    const pendingRevenue = Number(pendingRevenueAgg._sum.finalAmount || 0);

    return res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalPatients,
          totalDoctors,
          totalHospitals,
          totalAppointments,
          upcomingAppointments,
          completedAppointments,
          cancelledAppointments,
          totalInvoices,
          paidInvoicesCount,
          pendingInvoicesCount,
          paidRevenue,
          pendingRevenue,
          totalRevenue: paidRevenue,
        },
        appointmentDistribution: appointmentStatusGroups.map((g) => ({
          status: g.status,
          count: g._count.encounterId,
        })),
        invoiceDistribution: invoiceStatusGroups.map((g) => ({
          status: g.status,
          count: g._count.invoiceId,
          amount: Number(g._sum.finalAmount || 0),
        })),
        recentAppointments: recentAppointments.map((a) => ({
          encounterId: a.encounterId,
          patientName: `${a.patient?.user?.firstName || ''} ${a.patient?.user?.lastName || ''}`.trim() || 'Patient',
          doctorName: `Dr. ${a.doctor?.user?.firstName || ''} ${a.doctor?.user?.lastName || ''}`.trim(),
          hospitalName: a.hospital?.name || 'Hospital',
          scheduledTime: a.scheduledTime,
          status: a.status,
          visitType: a.visitType,
        })),
        recentPayments: recentPayments.map((p) => ({
          paymentId: p.paymentId,
          amount: Number(p.amount),
          mode: p.mode,
          status: p.status,
          createdAt: p.createdAt,
          patientName: `${p.invoice?.patient?.user?.firstName || ''} ${p.invoice?.patient?.user?.lastName || ''}`.trim() || 'Patient',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
