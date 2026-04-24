import React from 'react';

import Skeleton from '../Skeleton';

const times = ['09:00-10:00', '11:00-12:00', '14:00-15:00', '16:00-17:00'];

export default function ReservationCalendarSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mx-auto h-8 w-80 max-w-full" />
        <Skeleton className="mx-auto mt-3 h-4 w-64 max-w-full" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      <div className="space-y-5 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {times.map((time) => (
                <Skeleton key={`${index}-${time}`} className="h-12 w-full" />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="min-w-full">
          <div className="grid grid-cols-5 gap-px bg-slate-200">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-slate-50 px-4 py-3">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>

          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-5 gap-px bg-slate-100">
              {Array.from({ length: 5 }).map((_, cellIndex) => (
                <div key={cellIndex} className="bg-white px-3 py-3">
                  <Skeleton className={cellIndex === 0 ? 'h-5 w-28' : 'h-10 w-full'} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-5 w-72 max-w-full" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-36" />
        </div>
      </section>
    </div>
  );
}
