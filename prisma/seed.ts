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
  upcomingDate.setDate(upcomingDate.getDate() - 1);
  upcomingDate.setHours(21, 0, 0, 0);

  await prisma.event.create({
    data: {
      slug: "Gimme-More-Ya-lel",
      title: "Gimme more يا ليل",
      description:
        "DJ Lwes returns to the the Old Shool Club for another unparalleled musical experience — low lights, loud subs, no phones on the floor.",
      date: upcomingDate,
      location: "Old School Club, Haifa",
      coverImage: "/images/GimmeMore.jpg",
      isActive: true,
      ticketTypes: {
        create: [
          {
            name: "Early Bird",
            description: "Limited discounted entry before doors.",
            priceCents: 5000,
            quantityTotal: 20,
            quantityRemaining: 8,
          },
          {
            name: "Standard",
            description: "Standard entry, all night.",
            priceCents: 8000,
            quantityTotal: 70,
            quantityRemaining: 70,
          },
          {
            name: "Fashionably Late",
            description: "Last-minute entry, all night.",
            priceCents: 10000,
            quantityTotal: 25,
            quantityRemaining: 25,
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

  // Upsert, not delete-then-create — this is a singleton the admin edits
  // directly (see /admin/about), so a reseed shouldn't wipe out real
  // content. Only creates the row (with these starter defaults) if it
  // doesn't already exist.
  await prisma.aboutContent.upsert({
    where: { id: "about" },
    update: {},
    create: {
      bio: "DJ Lwes has spent the last few years building Etfe El Boiler from a one-room warehouse night into Haifa's home for deep, hypnotic house — low lights, loud subs, no phones on the floor. Every set is a slow build: no big drops, no filler, just a room that locks in together for six hours straight.",
      photos: ["/images/about-portrait.svg"],
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
