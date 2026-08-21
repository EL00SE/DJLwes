// Manual data seeding — there's no admin panel yet, so events are managed
// by editing this file and re-running `npm run db:seed`.
import { PrismaClient, GalleryItemType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Wipe existing data so the script is safely re-runnable during dev.
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.galleryItem.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.event.deleteMany();

  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 21);
  upcomingDate.setHours(22, 0, 0, 0);

  await prisma.event.create({
    data: {
      slug: "etfe-el-boiler-vol-3",
      title: "Etfe El Boiler Vol. 3",
      description:
        "DJ Lwes returns to the warehouse for another night of raw underground deep house — low lights, loud subs, no phones on the floor.",
      date: upcomingDate,
      location: "The Foundry, Haifa",
      coverImage: "/images/event-cover-boiler.svg",
      isActive: true,
      ticketTypes: {
        create: [
          {
            name: "Early Bird",
            description: "Limited discounted entry before doors.",
            priceCents: 2500,
            quantityTotal: 40,
            quantityRemaining: 12,
          },
          {
            name: "General Admission",
            description: "Standard entry, all night.",
            priceCents: 3500,
            quantityTotal: 150,
            quantityRemaining: 150,
          },
          {
            name: "VIP",
            description: "Priority entry, reserved area near the booth.",
            priceCents: 6000,
            quantityTotal: 25,
            quantityRemaining: 6,
          },
        ],
      },
    },
  });

  const pastWarehouseDate = new Date();
  pastWarehouseDate.setMonth(pastWarehouseDate.getMonth() - 3);

  await prisma.event.create({
    data: {
      slug: "etfe-el-boiler-vol-2",
      title: "Etfe El Boiler Vol. 2",
      description: "Sold out warehouse session. Six hours, one room, no breaks.",
      date: pastWarehouseDate,
      location: "The Foundry, Haifa",
      coverImage: "/images/past-warehouse-cover.svg",
      isActive: false,
      galleryItems: {
        create: [
          { type: GalleryItemType.IMAGE, url: "/images/gallery/warehouse-1.svg", caption: "Doors open", sortOrder: 0 },
          { type: GalleryItemType.IMAGE, url: "/images/gallery/warehouse-2.svg", caption: "Peak hour", sortOrder: 1 },
          { type: GalleryItemType.IMAGE, url: "/images/gallery/warehouse-3.svg", caption: "The booth", sortOrder: 2 },
        ],
      },
    },
  });

  const pastRooftopDate = new Date();
  pastRooftopDate.setMonth(pastRooftopDate.getMonth() - 7);

  await prisma.event.create({
    data: {
      slug: "etfe-el-boiler-rooftop",
      title: "Etfe El Boiler: Rooftop Sessions",
      description: "A sunset-to-sunrise rooftop edition of the party.",
      date: pastRooftopDate,
      location: "Skyline Terrace, Haifa",
      coverImage: "/images/past-rooftop-cover.svg",
      isActive: false,
      galleryItems: {
        create: [
          { type: GalleryItemType.IMAGE, url: "/images/gallery/rooftop-1.svg", caption: "Golden hour", sortOrder: 0 },
          { type: GalleryItemType.IMAGE, url: "/images/gallery/rooftop-2.svg", caption: "After dark", sortOrder: 1 },
        ],
      },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
