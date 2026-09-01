-- AlterTable
ALTER TABLE "Event" ADD COLUMN "coverImageFocalPoint" TEXT NOT NULL DEFAULT '50% 50%';

-- AlterTable
ALTER TABLE "GalleryItem" ADD COLUMN "focalPoint" TEXT NOT NULL DEFAULT '50% 50%';
