'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Clock, Target, Trophy } from 'lucide-react';

export interface LearningMilestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  completedDate?: Date;
  progress: number; // 0-100
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  actualHours?: number;
  skills: string[];
}

interface LearningProgressChartProps {
  milestones: LearningMilestone[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
}

export const LearningProgressChart: React.FC<LearningProgressChartProps> = ({
  milestones,
  title = "Learning Progress",
  description = "Track your learning milestones and achievements",
  isLoading = false,
  className = ""
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          const width = container.clientWidth - 40;
          setDimensions({ width, height: 600 });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!milestones || milestones.length === 0 || isLoading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const margin = { top: 40, right: 60, bottom: 60, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Sort milestones by target date
    const sortedMilestones = [...milestones].sort((a, b) => 
      a.targetDate.getTime() - b.targetDate.getTime()
    );

    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(sortedMilestones, d => d.targetDate) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleBand()
      .domain(sortedMilestones.map(d => d.id))
      .range([0, innerHeight])
      .padding(0.2);

    const colorScale = d3.scaleOrdinal()
      .domain(['beginner', 'intermediate', 'advanced'])
      .range(['#10b981', '#f59e0b', '#ef4444']);

    // Draw timeline axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat((d) => d3.timeFormat("%b %Y")(d as Date));

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis);

    // Draw current date line
    const currentDate = new Date();
    if (currentDate >= xScale.domain()[0] && currentDate <= xScale.domain()[1]) {
      g.append('line')
        .attr('x1', xScale(currentDate))
        .attr('x2', xScale(currentDate))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');

      g.append('text')
        .attr('x', xScale(currentDate))
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#ef4444')
        .text('Today');
    }

    // Draw milestone bars
    sortedMilestones.forEach(milestone => {
      const y = yScale(milestone.id)!;
      const barHeight = yScale.bandwidth();
      const barWidth = innerWidth * 0.8; // Fixed width for progress bars

      // Background bar
      g.append('rect')
        .attr('x', 20)
        .attr('y', y)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('fill', '#f1f5f9')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1)
        .attr('rx', 4);

      // Progress bar
      const progressWidth = (milestone.progress / 100) * barWidth;
      g.append('rect')
        .attr('x', 20)
        .attr('y', y)
        .attr('width', progressWidth)
        .attr('height', barHeight)
        .attr('fill', colorScale(milestone.difficulty) as string)
        .attr('rx', 4);

      // Progress text
      g.append('text')
        .attr('x', 20 + barWidth / 2)
        .attr('y', y + barHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', milestone.progress > 50 ? 'white' : '#1e293b')
        .text(`${milestone.progress}%`);

      // Milestone title and info
      g.append('text')
        .attr('x', 10)
        .attr('y', y + barHeight / 2 - 8)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#1e293b')
        .text(milestone.title);

      g.append('text')
        .attr('x', 10)
        .attr('y', y + barHeight / 2 + 8)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', '#64748b')
        .text(`${milestone.estimatedHours}h • ${milestone.category}`);

      // Target date marker
      const targetX = xScale(milestone.targetDate);
      g.append('line')
        .attr('x1', targetX)
        .attr('x2', targetX)
        .attr('y1', y - 5)
        .attr('y2', y + barHeight + 5)
        .attr('stroke', '#64748b')
        .attr('stroke-width', 2);

      g.append('circle')
        .attr('cx', targetX)
        .attr('cy', y + barHeight / 2)
        .attr('r', 4)
        .attr('fill', milestone.completedDate ? '#10b981' : '#64748b')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

      // Completion marker
      if (milestone.completedDate) {
        const completedX = xScale(milestone.completedDate);
        g.append('circle')
          .attr('cx', completedX)
          .attr('cy', y + barHeight / 2)
          .attr('r', 6)
          .attr('fill', '#10b981')
          .attr('stroke', 'white')
          .attr('stroke-width', 2);

        // Checkmark
        g.append('text')
          .attr('x', completedX)
          .attr('y', y + barHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('font-size', '10px')
          .style('fill', 'white')
          .text('✓');
      }

      // Skills tags
      const skillsText = milestone.skills.slice(0, 3).join(', ');
      if (skillsText) {
        g.append('text')
          .attr('x', 20 + barWidth + 10)
          .attr('y', y + barHeight / 2)
          .attr('dominant-baseline', 'middle')
          .style('font-size', '10px')
          .style('fill', '#64748b')
          .text(skillsText + (milestone.skills.length > 3 ? '...' : ''));
      }

      // Hover interaction
      g.append('rect')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', innerWidth)
        .attr('height', barHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseover', function(event) {
          const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '12px')
            .style('border-radius', '8px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('max-width', '300px');

          const timeSpent = milestone.actualHours ? 
            `${milestone.actualHours}h spent` : 
            `${milestone.estimatedHours}h estimated`;

          const status = milestone.completedDate ? 
            `Completed ${milestone.completedDate.toLocaleDateString()}` :
            `Due ${milestone.targetDate.toLocaleDateString()}`;

          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 8px;">${milestone.title}</div>
            <div style="margin-bottom: 4px;">${milestone.description}</div>
            <div style="margin-bottom: 4px;">Progress: ${milestone.progress}%</div>
            <div style="margin-bottom: 4px;">Difficulty: ${milestone.difficulty}</div>
            <div style="margin-bottom: 4px;">${timeSpent}</div>
            <div style="margin-bottom: 4px;">${status}</div>
            <div style="margin-top: 8px;">
              <strong>Skills:</strong> ${milestone.skills.join(', ')}
            </div>
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.selectAll('.tooltip').remove();
        });
    });

    // Add legend
    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth - 150}, 20)`);

    const legendData = [
      { label: 'Beginner', color: '#10b981' },
      { label: 'Intermediate', color: '#f59e0b' },
      { label: 'Advanced', color: '#ef4444' }
    ];

    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendItem.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', item.color)
        .attr('rx', 2);

      legendItem.append('text')
        .attr('x', 18)
        .attr('y', 6)
        .attr('dy', '0.35em')
        .style('font-size', '11px')
        .style('fill', '#1e293b')
        .text(item.label);
    });

  }, [milestones, dimensions, isLoading]);

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

  // Calculate summary statistics
  const completed = milestones.filter(m => m.completedDate).length;
  const inProgress = milestones.filter(m => m.progress > 0 && !m.completedDate).length;
  const notStarted = milestones.filter(m => m.progress === 0).length;
  const overdue = milestones.filter(m => 
    !m.completedDate && m.targetDate < new Date()
  ).length;

  const totalProgress = milestones.length > 0 ? 
    Math.round(milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length) : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <div className="flex gap-2">
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              {completed} Completed
            </Badge>
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              {inProgress} In Progress
            </Badge>
            {overdue > 0 && (
              <Badge variant="destructive">
                <Target className="w-3 h-3 mr-1" />
                {overdue} Overdue
              </Badge>
            )}
            <Badge variant="outline">
              <Trophy className="w-3 h-3 mr-1" />
              {totalProgress}% Overall
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <svg ref={svgRef} className="w-full h-auto" />
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningProgressChart;
