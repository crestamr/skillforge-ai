'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export interface SkillData {
  skill: string;
  userLevel: number;
  requiredLevel: number;
  category: string;
  maxLevel: number;
}

interface SkillRadarChartProps {
  data: SkillData[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
}

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({
  data,
  title = "Skill Assessment",
  description = "Compare your skills with job requirements",
  isLoading = false,
  className = ""
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          const width = Math.min(container.clientWidth - 40, 500);
          const height = width;
          setDimensions({ width, height });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || isLoading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const margin = 60;
    const radius = Math.min(width, height) / 2 - margin;
    const center = { x: width / 2, y: height / 2 };

    // Create main group
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${center.x}, ${center.y})`);

    // Prepare data
    const angleSlice = (Math.PI * 2) / data.length;
    const maxValue = Math.max(...data.map(d => Math.max(d.userLevel, d.requiredLevel, d.maxLevel)));

    // Create scales
    const radiusScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, radius]);

    // Draw circular grid
    const levels = 5;
    for (let i = 1; i <= levels; i++) {
      const levelRadius = (radius / levels) * i;
      
      g.append('circle')
        .attr('r', levelRadius)
        .attr('fill', 'none')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1)
        .attr('opacity', 0.5);

      // Add level labels
      g.append('text')
        .attr('x', 5)
        .attr('y', -levelRadius + 5)
        .attr('font-size', '10px')
        .attr('fill', '#64748b')
        .text(`${Math.round((maxValue / levels) * i)}`);
    }

    // Draw axis lines and labels
    data.forEach((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Axis line
      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1);

      // Skill labels
      const labelRadius = radius + 20;
      const labelX = Math.cos(angle) * labelRadius;
      const labelY = Math.sin(angle) * labelRadius;

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', labelX > 0 ? 'start' : 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', '500')
        .attr('fill', '#1e293b')
        .text(d.skill);
    });

    // Create line generator
    const line = d3.line<{x: number, y: number}>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveLinearClosed);

    // Draw user skills area
    const userPoints = data.map((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const r = radiusScale(d.userLevel);
      return {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      };
    });

    g.append('path')
      .datum(userPoints)
      .attr('d', line)
      .attr('fill', '#3b82f6')
      .attr('fill-opacity', 0.2)
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2);

    // Draw required skills area
    const requiredPoints = data.map((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const r = radiusScale(d.requiredLevel);
      return {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      };
    });

    g.append('path')
      .datum(requiredPoints)
      .attr('d', line)
      .attr('fill', '#ef4444')
      .attr('fill-opacity', 0.1)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');

    // Add data points
    data.forEach((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      
      // User level point
      const userR = radiusScale(d.userLevel);
      const userX = Math.cos(angle) * userR;
      const userY = Math.sin(angle) * userR;

      g.append('circle')
        .attr('cx', userX)
        .attr('cy', userY)
        .attr('r', 4)
        .attr('fill', '#3b82f6')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);

      // Required level point
      const reqR = radiusScale(d.requiredLevel);
      const reqX = Math.cos(angle) * reqR;
      const reqY = Math.sin(angle) * reqR;

      g.append('circle')
        .attr('cx', reqX)
        .attr('cy', reqY)
        .attr('r', 3)
        .attr('fill', '#ef4444')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);
    });

    // Add legend
    const legend = g.append('g')
      .attr('transform', `translate(${-radius + 20}, ${radius - 40})`);

    legend.append('circle')
      .attr('r', 4)
      .attr('fill', '#3b82f6');

    legend.append('text')
      .attr('x', 10)
      .attr('y', 5)
      .attr('font-size', '12px')
      .attr('fill', '#1e293b')
      .text('Your Level');

    legend.append('circle')
      .attr('cy', 20)
      .attr('r', 3)
      .attr('fill', '#ef4444');

    legend.append('text')
      .attr('x', 10)
      .attr('y', 25)
      .attr('font-size', '12px')
      .attr('fill', '#1e293b')
      .text('Required Level');

  }, [data, dimensions, isLoading]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-96" />
        </CardContent>
      </Card>
    );
  }

  const skillGaps = data.filter(d => d.requiredLevel > d.userLevel);
  const strengths = data.filter(d => d.userLevel >= d.requiredLevel);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <div className="flex gap-2">
            <Badge variant="secondary">{strengths.length} Strengths</Badge>
            <Badge variant="destructive">{skillGaps.length} Gaps</Badge>
          </div>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full flex justify-center">
          <svg ref={svgRef} className="max-w-full h-auto" />
        </div>
        
        {skillGaps.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">Priority Skills to Develop:</h4>
            <div className="flex flex-wrap gap-2">
              {skillGaps.map((skill, index) => (
                <Badge key={index} variant="outline" className="text-red-700 border-red-300">
                  {skill.skill} ({skill.requiredLevel - skill.userLevel} levels)
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SkillRadarChart;
