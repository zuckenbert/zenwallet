import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample lead
  const lead = await prisma.lead.upsert({
    where: { phone: '5511999990000' },
    update: {},
    create: {
      phone: '5511999990000',
      name: 'João Teste',
      cpf: '52998224725',
      email: 'joao@teste.com',
      birthDate: new Date('1990-05-15'),
      monthlyIncome: 8000,
      employmentType: 'CLT',
      employerName: 'Empresa Teste LTDA',
      stage: 'NEW',
    },
  });

  console.log(`Lead created: ${lead.name} (${lead.phone})`);

  // Create sample application
  const application = await prisma.application.upsert({
    where: { id: 'seed-app-001' },
    update: {},
    create: {
      id: 'seed-app-001',
      leadId: lead.id,
      requestedAmount: 15000,
      installments: 24,
      interestRate: 1.99,
      monthlyPayment: 764.43,
      totalAmount: 18346.32,
      purpose: 'DEBT_CONSOLIDATION',
      status: 'SIMULATED',
    },
  });

  console.log(`Application created: R$ ${application.requestedAmount} in ${application.installments}x`);

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
