from datetime import datetime
from dateutil.relativedelta import relativedelta
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
            cutoff = datetime.now() - relativedelta(months=1)

            result = await session.execute(select(Reservation))
            all_reservations = result.scalars().all()

            past_reservation_ids = []
            for reservation in all_reservations:
                try:
                    start_time = reservation.time.split("-")[0]
                    reservation_datetime = datetime.strptime(
                        f"{reservation.day} {start_time}", "%Y-%m-%d %H:%M"
                    )

                    if reservation_datetime < cutoff:
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
                logger.info("Deleted %s past reservations", result.rowcount)

        except Exception as e:
            logger.exception(f"Error during reservation cleanup: {e}")
            await session.rollback()
        finally:
            await session.close()
