'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Users, TrendingUp } from 'lucide-react';

export interface SalaryData {
  role: string;
  experience: string;
  location: string;
  minSalary: number;
  maxSalary: number;
  medianSalary: number;
  percentile25: number;
  percentile75: number;
  sampleSize: number;
  yearOverYearGrowth: number;
}

interface SalaryBenchmarkChartProps {
  data: SalaryData[];
  userSalary?: number;
  title?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
}

export const SalaryBenchmarkChart: React.FC<SalaryBenchmarkChartProps> = ({
  data,
  userSalary,
  title = "Salary Benchmarking",
  description = "Compare salaries by role, experience, and location",
  isLoading = false,
  className = ""
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [viewType, setViewType] = useState<'box' | 'bar'>('box');

  // Get unique values for filters
  const roles = ['all', ...Array.from(new Set(data.map(d => d.role)))];
  const locations = ['all', ...Array.from(new Set(data.map(d => d.location)))];

  // Filter data based on selections
  const filteredData = data.filter(d => 
    (selectedRole === 'all' || d.role === selectedRole) &&
    (selectedLocation === 'all' || d.location === selectedLocation)
  );

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          const width = container.clientWidth - 40;
          setDimensions({ width, height: 500 });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!filteredData || filteredData.length === 0 || isLoading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 60, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    if (viewType === 'box') {
      // Box plot view
      const experienceLevels = ['Entry', 'Mid', 'Senior', 'Lead', 'Principal'];
      const filteredExperience = experienceLevels.filter(exp => 
        filteredData.some(d => d.experience === exp)
      );

      const xScale = d3.scaleBand()
        .domain(filteredExperience)
        .range([0, innerWidth])
        .padding(0.2);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.maxSalary) || 200000])
        .range([innerHeight, 0]);

      // Draw axes
      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale));

      g.append('g')
        .call(d3.axisLeft(yScale).tickFormat(d => `$${(d as number)/1000}k`));

      // Draw box plots for each experience level
      filteredExperience.forEach(exp => {
        const expData = filteredData.filter(d => d.experience === exp);
        if (expData.length === 0) return;

        const x = xScale(exp)!;
        const boxWidth = xScale.bandwidth() * 0.6;
        const boxX = x + (xScale.bandwidth() - boxWidth) / 2;

        // Calculate statistics
        const q1 = d3.median(expData, d => d.percentile25) || 0;
        const median = d3.median(expData, d => d.medianSalary) || 0;
        const q3 = d3.median(expData, d => d.percentile75) || 0;
        const min = d3.min(expData, d => d.minSalary) || 0;
        const max = d3.max(expData, d => d.maxSalary) || 0;

        // Draw box
        g.append('rect')
          .attr('x', boxX)
          .attr('y', yScale(q3))
          .attr('width', boxWidth)
          .attr('height', yScale(q1) - yScale(q3))
          .attr('fill', '#3b82f6')
          .attr('fill-opacity', 0.3)
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 2);

        // Draw median line
        g.append('line')
          .attr('x1', boxX)
          .attr('x2', boxX + boxWidth)
          .attr('y1', yScale(median))
          .attr('y2', yScale(median))
          .attr('stroke', '#1e40af')
          .attr('stroke-width', 3);

        // Draw whiskers
        g.append('line')
          .attr('x1', boxX + boxWidth/2)
          .attr('x2', boxX + boxWidth/2)
          .attr('y1', yScale(q3))
          .attr('y2', yScale(max))
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 1);

        g.append('line')
          .attr('x1', boxX + boxWidth/2)
          .attr('x2', boxX + boxWidth/2)
          .attr('y1', yScale(q1))
          .attr('y2', yScale(min))
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 1);

        // Draw whisker caps
        g.append('line')
          .attr('x1', boxX + boxWidth*0.25)
          .attr('x2', boxX + boxWidth*0.75)
          .attr('y1', yScale(max))
          .attr('y2', yScale(max))
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 1);

        g.append('line')
          .attr('x1', boxX + boxWidth*0.25)
          .attr('x2', boxX + boxWidth*0.75)
          .attr('y1', yScale(min))
          .attr('y2', yScale(min))
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 1);

        // Add data points
        expData.forEach((d, i) => {
          g.append('circle')
            .attr('cx', boxX + boxWidth/2 + (Math.random() - 0.5) * boxWidth * 0.3)
            .attr('cy', yScale(d.medianSalary))
            .attr('r', 3)
            .attr('fill', '#ef4444')
            .attr('fill-opacity', 0.6)
            .on('mouseover', function(event) {
              const tooltip = d3.select('body')
                .append('div')
                .attr('class', 'tooltip')
                .style('position', 'absolute')
                .style('background', 'rgba(0, 0, 0, 0.8)')
                .style('color', 'white')
                .style('padding', '8px')
                .style('border-radius', '4px')
                .style('font-size', '12px')
                .style('pointer-events', 'none')
                .style('z-index', '1000');

              tooltip.html(`
                <strong>${d.role}</strong><br/>
                Experience: ${d.experience}<br/>
                Location: ${d.location}<br/>
                Median: $${d.medianSalary.toLocaleString()}<br/>
                Range: $${d.minSalary.toLocaleString()} - $${d.maxSalary.toLocaleString()}<br/>
                Sample Size: ${d.sampleSize}<br/>
                YoY Growth: ${d.yearOverYearGrowth > 0 ? '+' : ''}${d.yearOverYearGrowth}%
              `)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
              d3.selectAll('.tooltip').remove();
            });
        });
      });

      // Draw user salary line if provided
      if (userSalary) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', yScale(userSalary))
          .attr('y2', yScale(userSalary))
          .attr('stroke', '#10b981')
          .attr('stroke-width', 3)
          .attr('stroke-dasharray', '5,5');

        g.append('text')
          .attr('x', innerWidth - 10)
          .attr('y', yScale(userSalary) - 5)
          .attr('text-anchor', 'end')
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .style('fill', '#10b981')
          .text(`Your Salary: $${userSalary.toLocaleString()}`);
      }

    } else {
      // Bar chart view
      const xScale = d3.scaleBand()
        .domain(filteredData.map(d => `${d.role} (${d.experience})`))
        .range([0, innerWidth])
        .padding(0.1);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.maxSalary) || 200000])
        .range([innerHeight, 0]);

      // Draw axes
      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');

      g.append('g')
        .call(d3.axisLeft(yScale).tickFormat(d => `$${(d as number)/1000}k`));

      // Draw bars
      filteredData.forEach(d => {
        const x = xScale(`${d.role} (${d.experience})`)!;
        const barWidth = xScale.bandwidth();

        // Min-Max range bar
        g.append('rect')
          .attr('x', x)
          .attr('y', yScale(d.maxSalary))
          .attr('width', barWidth)
          .attr('height', yScale(d.minSalary) - yScale(d.maxSalary))
          .attr('fill', '#e2e8f0')
          .attr('stroke', '#94a3b8')
          .attr('stroke-width', 1);

        // 25th-75th percentile bar
        g.append('rect')
          .attr('x', x)
          .attr('y', yScale(d.percentile75))
          .attr('width', barWidth)
          .attr('height', yScale(d.percentile25) - yScale(d.percentile75))
          .attr('fill', '#3b82f6')
          .attr('fill-opacity', 0.7);

        // Median line
        g.append('line')
          .attr('x1', x)
          .attr('x2', x + barWidth)
          .attr('y1', yScale(d.medianSalary))
          .attr('y2', yScale(d.medianSalary))
          .attr('stroke', '#1e40af')
          .attr('stroke-width', 3);
      });
    }

    // Add axis labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#64748b')
      .text('Annual Salary (USD)');

    g.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#64748b')
      .text(viewType === 'box' ? 'Experience Level' : 'Role & Experience');

  }, [filteredData, dimensions, isLoading, viewType, userSalary]);

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
  const avgSalary = d3.mean(filteredData, d => d.medianSalary) || 0;
  const totalSamples = d3.sum(filteredData, d => d.sampleSize);
  const avgGrowth = d3.mean(filteredData, d => d.yearOverYearGrowth) || 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              <div className="flex gap-2">
                <Badge variant="secondary">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ${Math.round(avgSalary/1000)}k avg
                </Badge>
                <Badge variant="outline">
                  <Users className="w-3 h-3 mr-1" />
                  {totalSamples} samples
                </Badge>
                <Badge variant={avgGrowth > 0 ? "default" : "destructive"}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {avgGrowth > 0 ? '+' : ''}{avgGrowth.toFixed(1)}% YoY
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={viewType} onValueChange={(value: 'box' | 'bar') => setViewType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="box">Box Plot</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role === 'all' ? 'All Roles' : role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location} value={location}>
                    {location === 'all' ? 'All Locations' : location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <svg ref={svgRef} className="w-full h-auto" />
        </div>
      </CardContent>
    </Card>
  );
};

export default SalaryBenchmarkChart;
