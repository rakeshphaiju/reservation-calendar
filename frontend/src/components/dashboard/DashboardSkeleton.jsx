import React from 'react';
import PropTypes from 'prop-types';

import Skeleton from '../Skeleton';

const StatCardSkeleton = () => (
  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <Skeleton className="h-4 w-28" />
    <Skeleton className="mt-3 h-8 w-16" />
  </article>
);

const SettingsCardSkeleton = ({ lines = 3, tall = false }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <Skeleton className="h-5 w-40" />
    <Skeleton className="mt-2 h-4 w-56" />
    <div className="mt-5 space-y-3">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={tall && index === lines - 1 ? 'h-28 w-full' : 'h-11 w-full'}
        />
      ))}
    </div>
    <Skeleton className="mt-5 h-10 w-32" />
  </div>
);

SettingsCardSkeleton.propTypes = {
  lines: PropTypes.number,
  tall: PropTypes.bool,
};

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-9 w-72 max-w-full" />
        <Skeleton className="mt-4 h-5 w-80 max-w-full" />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <SettingsCardSkeleton lines={2} />
            <SettingsCardSkeleton lines={2} />
            <SettingsCardSkeleton lines={2} />
            <SettingsCardSkeleton lines={4} />
          </div>

          <div className="flex flex-col gap-4">
            <SettingsCardSkeleton lines={3} tall />
            <SettingsCardSkeleton lines={5} tall />
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        <Skeleton className="mt-5 h-10 w-40" />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </section>

      <Skeleton className="h-10 w-44" />
    </div>
  );
}
