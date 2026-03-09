import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  // Income categories
  { name: 'Prestations de services', type: 'income', color: '#10B981', icon: 'briefcase', isDefault: true, taxDeductible: false },
  { name: 'Vente de produits', type: 'income', color: '#059669', icon: 'shopping-cart', isDefault: true, taxDeductible: false },
  { name: 'Subventions', type: 'income', color: '#34D399', icon: 'gift', isDefault: true, taxDeductible: false },
  { name: 'Autres revenus', type: 'income', color: '#6EE7B7', icon: 'plus-circle', isDefault: true, taxDeductible: false },

  // Expense categories
  { name: 'Fournitures de bureau', type: 'expense', color: '#3B82F6', icon: 'paperclip', isDefault: true, taxDeductible: true },
  { name: 'Loyer et charges', type: 'expense', color: '#6366F1', icon: 'home', isDefault: true, taxDeductible: true },
  { name: 'Énergie (électricité, gaz, eau)', type: 'expense', color: '#8B5CF6', icon: 'zap', isDefault: true, taxDeductible: true },
  { name: 'Téléphone et internet', type: 'expense', color: '#A855F7', icon: 'phone', isDefault: true, taxDeductible: true },
  { name: 'Transports et déplacements', type: 'expense', color: '#EC4899', icon: 'car', isDefault: true, taxDeductible: true },
  { name: 'Repas et réception', type: 'expense', color: '#F43F5E', icon: 'utensils', isDefault: true, taxDeductible: true },
  { name: 'Assurances', type: 'expense', color: '#EF4444', icon: 'shield', isDefault: true, taxDeductible: true },
  { name: 'Frais bancaires', type: 'expense', color: '#F97316', icon: 'credit-card', isDefault: true, taxDeductible: true },
  { name: 'Expert-comptable', type: 'expense', color: '#EAB308', icon: 'calculator', isDefault: true, taxDeductible: true },
  { name: 'Publicité et marketing', type: 'expense', color: '#84CC16', icon: 'megaphone', isDefault: true, taxDeductible: true },
  { name: 'Formation', type: 'expense', color: '#22C55E', icon: 'book', isDefault: true, taxDeductible: true },
  { name: 'Matériel et équipement', type: 'expense', color: '#14B8A6', icon: 'monitor', isDefault: true, taxDeductible: true },
  { name: 'Salaire et charges sociales', type: 'expense', color: '#0EA5E9', icon: 'users', isDefault: true, taxDeductible: true },
  { name: 'Impôts et taxes', type: 'expense', color: '#64748B', icon: 'file-text', isDefault: true, taxDeductible: false },
];

async function main() {
  console.log('Seeding default categories...');

  for (const category of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: category.name, type: category.type }
    });

    if (!existing) {
      await prisma.category.create({ data: category });
      console.log(`Created: ${category.name}`);
    } else {
      console.log(`Skipped (exists): ${category.name}`);
    }
  }

  console.log('Categories seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
