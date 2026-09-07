"use client";

import { useEffect, useMemo, useState } from "react";

import type { Project } from "@selaura/types";

import { ProjectCard } from "@/components/projects/ProjectCard";

interface FeaturedProjectsProps {
  projects: Project[];
}

export function FeaturedProjects({ projects }: FeaturedProjectsProps) {
  const sortedProjects = useMemo(() => {
    return [...projects].sort(
      (a, b) => (b.downloads ?? 0) - (a.downloads ?? 0),
    );
  }, [projects]);

  const [cardsPerRow, setCardsPerRow] = useState(6);

  useEffect(() => {
    function updateCardsPerRow() {
      const cardWidth = window.innerWidth >= 640 ? 240 : 210;

      const gap = 12;

      const visibleCards = Math.ceil(window.innerWidth / (cardWidth + gap));

      setCardsPerRow(Math.max(4, visibleCards + 2));
    }

    updateCardsPerRow();

    window.addEventListener("resize", updateCardsPerRow);

    return () => {
      window.removeEventListener("resize", updateCardsPerRow);
    };
  }, []);

  const featuredProjects = useMemo(() => {
    if (sortedProjects.length === 0) {
      return [];
    }

    const required = cardsPerRow * 2;

    const result: Project[] = [];

    for (let index = 0; index < required; index++) {
      result.push(sortedProjects[index % sortedProjects.length]);
    }

    return result;
  }, [sortedProjects, cardsPerRow]);

  const topRow = featuredProjects.slice(0, cardsPerRow);

  const bottomRow = featuredProjects.slice(cardsPerRow, cardsPerRow * 2);

  return (
    <div className={["relative -mx-5", "sm:-mx-6"].join(" ")}>
      {}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-30 w-10 sm:w-20 lg:w-32"
        style={{
          background:
            "linear-gradient(to right, var(--background), transparent)",
        }}
      />

      {}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-30 w-10 sm:w-20 lg:w-32"
        style={{
          background:
            "linear-gradient(to left, var(--background), transparent)",
        }}
      />

      <div className="space-y-4">
        <ProjectMarquee projects={topRow} direction="left" />

        <ProjectMarquee projects={bottomRow} direction="right" />
      </div>
    </div>
  );
}

function ProjectMarquee({
  projects,
  direction,
}: {
  projects: Project[];
  direction: "left" | "right";
}) {
  const [paused, setPaused] = useState(false);

  if (projects.length === 0) {
    return null;
  }

  const items = [...projects, ...projects];

  return (
    <div
      className="overflow-x-hidden overflow-y-visible"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={[
          "flex w-max gap-3",
          "py-1",
          "will-change-transform",
          direction === "left"
            ? "animate-selaura-marquee-left"
            : "animate-selaura-marquee-right",
        ].join(" ")}
        style={{
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {items.map((project, index) => (
          <div
            key={`${project.id}-${index}`}
            className={["w-[210px] shrink-0", "sm:w-[240px]"].join(" ")}
          >
            <ProjectCard project={project} />
          </div>
        ))}
      </div>
    </div>
  );
}
