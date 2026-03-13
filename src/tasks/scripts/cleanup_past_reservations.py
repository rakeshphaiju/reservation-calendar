from datetime import datetime
from sqlalchemy import select, delete
from src.models.reservation import Reservation
from src.common.db import AsyncSessionLocal
from src.common.logger import logger


async def cleanup_past_reservations():
    """
    Async cron job to delete reservations that are in the past.
    """
    async with AsyncSessionLocal() as session:
        try:
            logger.info("Starting async cleanup of past reservations...")

            now = datetime.now()

            result = await session.execute(select(Reservation))
            all_reservations = result.scalars().all()

            past_reservation_ids = []
            for reservation in all_reservations:
                try:
                    reservation_datetime = datetime.strptime(
                        f"{reservation.day} {reservation.time}", "%Y-%m-%d %H:%M"
                    )

                    if reservation_datetime < now:
                        past_reservation_ids.append(reservation.id)

                except ValueError:
                    logger.warning(
                        f"Invalid date/time format for reservation {reservation.id}: {reservation.day} {reservation.time}"
                    )
                    past_reservation_ids.append(reservation.id)

            if past_reservation_ids:
                delete_stmt = delete(Reservation).where(
                    Reservation.id.in_(past_reservation_ids)
                )
                result = await session.execute(delete_stmt)
                await session.commit()
                logger.info(f"Deleted {result.rowcount} past reservations")
            else:
                logger.info("No past reservations to delete")

            await session.close()

        except Exception as e:
            logger.exception(f"Error during reservation cleanup: {e}")
            await session.rollback()
        finally:
            await session.close()
