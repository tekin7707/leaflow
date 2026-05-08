import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

async function reset() {
  // delete in order respecting FKs
  await prisma.approval.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.proof.deleteMany();
  await prisma.taskRun.deleteMany();
  await prisma.taskGroupRun.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskGroup.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionGroup.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.teamRef.deleteMany();
  await prisma.user.deleteMany();
}

async function seed() {
  await reset();

  // Users
  const userDefs = [
    { email: 'admin@provit.test', displayName: 'Admin Yönetici' },
    { email: 'ayse@provit.test', displayName: 'Ayşe Demir' },
    { email: 'mehmet@provit.test', displayName: 'Mehmet Yılmaz' },
    { email: 'zeynep@provit.test', displayName: 'Zeynep Kaya' },
    { email: 'ali@provit.test', displayName: 'Ali Çelik' },
    { email: 'fatma@provit.test', displayName: 'Fatma Aydın' },
    { email: 'kemal@provit.test', displayName: 'Kemal Şahin' },
    { email: 'elif@provit.test', displayName: 'Elif Polat' },
  ];
  const users = {};
  for (const u of userDefs) {
    const created = await prisma.user.create({
      data: {
        externalId: `ext_${u.email.split('@')[0]}`,
        email: u.email,
        displayName: u.displayName,
      },
    });
    users[u.email] = created;
  }

  // Teams
  const teamDefs = [
    { code: 'bahcesehir', name: 'Bahçeşehir', manager: 'ayse@provit.test', members: ['mehmet@provit.test', 'admin@provit.test'] },
    { code: 'kadikoy', name: 'Kadıköy', manager: 'kemal@provit.test', members: ['zeynep@provit.test', 'elif@provit.test', 'admin@provit.test'] },
    { code: 'atasehir', name: 'Ataşehir', manager: 'ali@provit.test', members: ['fatma@provit.test', 'admin@provit.test'] },
  ];
  const teams = {};
  for (const t of teamDefs) {
    const team = await prisma.teamRef.create({
      data: { code: t.code, name: t.name, externalId: `ext_${t.code}` },
    });
    teams[t.code] = team;
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: users[t.manager].id, role: 'MANAGER' },
    });
    for (const m of t.members) {
      await prisma.teamMember.create({
        data: { teamId: team.id, userId: users[m].id, role: m === 'admin@provit.test' ? 'MANAGER' : 'MEMBER' },
      });
    }
  }

  // Question groups
  const qgOpen = await prisma.questionGroup.create({
    data: {
      name: 'Açılış Kontrolü',
      questions: {
        create: [
          { text: 'Tezgah temizliği yapıldı mı?', answerType: 'YES_NO', weight: 4, required: true, order: 0 },
          { text: 'Kasa açılışı tamamlandı mı?', answerType: 'YES_NO', weight: 5, required: true, order: 1 },
          { text: 'Soğutucu sıcaklığı uygun mu?', answerType: 'NUMBER', weight: 3, required: true, order: 2 },
          { text: 'Fırın çalışır durumda mı?', answerType: 'YES_NO_NA', weight: 4, required: true, order: 3 },
          { text: 'Notlar', answerType: 'TEXT', weight: 1, required: false, order: 4 },
        ],
      },
    },
  });
  const qgClose = await prisma.questionGroup.create({
    data: {
      name: 'Kapanış Kontrolü',
      questions: {
        create: [
          { text: 'Kapı kilitlendi mi?', answerType: 'YES_NO', weight: 5, required: true, order: 0 },
          { text: 'Kasa sayımı yapıldı mı?', answerType: 'YES_NO', weight: 5, required: true, order: 1 },
          { text: 'Çöp atıldı mı?', answerType: 'YES_NO', weight: 3, required: true, order: 2 },
          { text: 'Notlar', answerType: 'TEXT', weight: 1, required: false, order: 3 },
        ],
      },
    },
  });

  // Task group 1 — DAILY with dependsOn chain
  const tgDaily = await prisma.taskGroup.create({
    data: {
      name: 'Sabah Açılış Rutini',
      description: 'Her gün sabah açılışta tamamlanması gereken adımlar',
      requiresApproval: true,
      minFiles: 1,
      recurrence: 'DAILY',
    },
  });
  const t1 = await prisma.task.create({
    data: { groupId: tgDaily.id, name: 'Mağazayı aç', order: 0, estimatedMinutes: 5, minFiles: 1 },
  });
  const t2 = await prisma.task.create({
    data: { groupId: tgDaily.id, name: 'Açılış kontrolü', order: 1, estimatedMinutes: 15, minFiles: 1, requiresApproval: true, questionGroupId: qgOpen.id, dependsOn: [t1.id] },
  });
  const t3 = await prisma.task.create({
    data: { groupId: tgDaily.id, name: 'Kasa açılışı', order: 2, estimatedMinutes: 10, minFiles: 0, dependsOn: [t2.id] },
  });
  const t4 = await prisma.task.create({
    data: { groupId: tgDaily.id, name: 'Müşteriye hazır işareti', order: 3, estimatedMinutes: 2, dependsOn: [t3.id] },
  });

  // Task group 2 — Weekly
  const tgWeekly = await prisma.taskGroup.create({
    data: {
      name: 'Haftalık Stok Kontrolü',
      description: 'Pazartesi günleri yapılır',
      requiresApproval: false,
      minFiles: 0,
      recurrence: 'WEEKLY:1',
    },
  });
  const w1 = await prisma.task.create({
    data: { groupId: tgWeekly.id, name: 'Stok sayımı', order: 0, estimatedMinutes: 60, minFiles: 2 },
  });
  const w2 = await prisma.task.create({
    data: { groupId: tgWeekly.id, name: 'Eksik ürünleri raporla', order: 1, estimatedMinutes: 15, dependsOn: [w1.id] },
  });
  await prisma.task.create({
    data: { groupId: tgWeekly.id, name: 'Sipariş ver', order: 2, estimatedMinutes: 20, requiresApproval: true, dependsOn: [w2.id] },
  });

  // Task group 3 — Monthly
  const tgMonthly = await prisma.taskGroup.create({
    data: {
      name: 'Aylık Bakım',
      description: 'Genel bakım ve temizlik',
      requiresApproval: false,
      minFiles: 0,
      recurrence: null,
    },
  });
  for (let i = 0; i < 5; i++) {
    await prisma.task.create({
      data: {
        groupId: tgMonthly.id,
        name: ['Klima filtresi', 'Soğutucu temizliği', 'Aydınlatma kontrolü', 'Yangın söndürücü', 'Genel kontrol'][i],
        order: i,
        estimatedMinutes: 30,
        minFiles: 1,
        questionGroupId: i === 4 ? qgClose.id : null,
      },
    });
  }

  // Assignments
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  const assignments = [];
  // past — daily, completed
  assignments.push(await prisma.assignment.create({
    data: { groupId: tgDaily.id, teamId: teams.bahcesehir.id, startsAt: addDays(today, -3), endsAt: yesterday, status: 'COMPLETED' },
  }));
  // today — daily for 3 teams
  for (const code of ['bahcesehir', 'kadikoy', 'atasehir']) {
    assignments.push(await prisma.assignment.create({
      data: { groupId: tgDaily.id, teamId: teams[code].id, startsAt: today, endsAt: today, status: 'ACTIVE' },
    }));
  }
  // tomorrow — weekly Monday (kadikoy)
  assignments.push(await prisma.assignment.create({
    data: { groupId: tgWeekly.id, teamId: teams.kadikoy.id, startsAt: tomorrow, endsAt: addDays(tomorrow, 6) },
  }));
  // future — monthly maintenance bahcesehir
  assignments.push(await prisma.assignment.create({
    data: { groupId: tgMonthly.id, teamId: teams.bahcesehir.id, startsAt: nextWeek, endsAt: addDays(nextWeek, 1) },
  }));

  // Materialize runs (simplified — call once per assignment)
  // We do this inline since seed runs outside the API process.
  const { expandRecurrence, buildRunsPlan } = await import('../src/services/recurrence.js');
  for (const a of assignments) {
    const grp = await prisma.taskGroup.findUnique({
      where: { id: a.groupId },
      include: { tasks: { orderBy: { order: 'asc' } } },
    });
    const dates = expandRecurrence(grp.recurrence, a.startsAt, a.endsAt);
    const plan = buildRunsPlan(a, grp, dates);
    for (const p of plan) {
      const run = await prisma.taskGroupRun.upsert({
        where: { assignmentId_date: { assignmentId: a.id, date: p.date } },
        update: {},
        create: { assignmentId: a.id, date: p.date },
      });
      for (const tr of p.taskRuns) {
        await prisma.taskRun.upsert({
          where: { runId_taskId: { runId: run.id, taskId: tr.taskId } },
          update: {},
          create: { runId: run.id, taskId: tr.taskId, status: tr.status },
        });
      }
    }
  }

  // For TODAY assignments mark some taskRuns as DONE / AWAITING_APPROVAL
  // First task of bahcesehir today → DONE; second → AWAITING_APPROVAL with pending approval
  const todayBahce = assignments[1]; // first today assignment
  const todayBahceRun = await prisma.taskGroupRun.findFirst({ where: { assignmentId: todayBahce.id } });
  const taskRuns = await prisma.taskRun.findMany({
    where: { runId: todayBahceRun.id },
    include: { task: true },
    orderBy: { task: { order: 'asc' } },
  });
  if (taskRuns[0]) {
    await prisma.taskRun.update({
      where: { id: taskRuns[0].id },
      data: {
        status: 'DONE',
        assigneeId: users['mehmet@provit.test'].id,
        completedAt: new Date(),
        startedAt: new Date(Date.now() - 5 * 60 * 1000),
        proofs: { create: { key: 'seed-proof.jpg', filename: 'opening.jpg', mime: 'image/jpeg', sizeBytes: 12345 } },
      },
    });
    if (taskRuns[1]) {
      await prisma.taskRun.update({
        where: { id: taskRuns[1].id },
        data: {
          status: 'AWAITING_APPROVAL',
          assigneeId: users['mehmet@provit.test'].id,
          completedAt: new Date(),
          startedAt: new Date(Date.now() - 15 * 60 * 1000),
          proofs: { create: { key: 'seed-proof2.jpg', filename: 'check.jpg', mime: 'image/jpeg', sizeBytes: 23456 } },
          approvals: { create: { decision: 'PENDING' } },
        },
      });

      // Demonstrate per-checklist-item proofs: pick the first required question of
      // this task's checklist, record an answer, then attach a proof to that answer.
      const tr1 = await prisma.taskRun.findUnique({
        where: { id: taskRuns[1].id },
        include: { task: { include: { questionGroup: { include: { questions: { orderBy: { order: 'asc' } } } } } } },
      });
      const firstQ = tr1?.task.questionGroup?.questions[0];
      if (firstQ) {
        const ans = await prisma.answer.create({
          data: {
            taskRunId: tr1.id,
            questionId: firstQ.id,
            value: firstQ.answerType === 'NUMBER' ? '4' : 'YES',
            note: 'Seed: checklist item proof',
          },
        });
        await prisma.proof.create({
          data: {
            taskRunId: tr1.id,
            answerId: ans.id,
            key: `seed-answer-${ans.id}.jpg`,
            filename: 'item-photo.jpg',
            mime: 'image/jpeg',
            sizeBytes: 9876,
          },
        });
      }
    }
  }

  // 4 pending approvals for variety — one per other today assignment first task
  for (const a of [assignments[2], assignments[3]]) {
    const r = await prisma.taskGroupRun.findFirst({ where: { assignmentId: a.id } });
    if (!r) continue;
    const trs = await prisma.taskRun.findMany({
      where: { runId: r.id },
      include: { task: true },
      orderBy: { task: { order: 'asc' } },
      take: 2,
    });
    for (const tr of trs) {
      await prisma.taskRun.update({
        where: { id: tr.id },
        data: {
          status: 'AWAITING_APPROVAL',
          assigneeId: users['ayse@provit.test'].id,
          completedAt: new Date(),
          startedAt: new Date(Date.now() - 20 * 60 * 1000),
          proofs: { create: { key: `seed-${tr.id}.jpg`, filename: 'photo.jpg', mime: 'image/jpeg', sizeBytes: 11111 } },
          approvals: { create: { decision: 'PENDING' } },
        },
      });
    }
  }

  console.log('Seed complete:');
  console.log(`  ${userDefs.length} users, ${teamDefs.length} teams, 2 question groups, 3 task groups`);
  console.log(`  ${assignments.length} assignments`);
  console.log('Login as admin@provit.test (any password).');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
