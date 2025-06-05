'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface TrendData {
  date: Date;
  skill: string;
  demand: number;
  growth: number;
  location: string;
  industry: string;
}

interface JobMarketTrendsChartProps {
  data: TrendData[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
}

export const JobMarketTrendsChart: React.FC<JobMarketTrendsChartProps> = ({
  data,
  title = "Job Market Trends",
  description = "Track skill demand and growth over time",
  isLoading = false,
  className = ""
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');

  // Get unique values for filters
  const locations = ['all', ...Array.from(new Set(data.map(d => d.location)))];
  const industries = ['all', ...Array.from(new Set(data.map(d => d.industry)))];
  const skills = ['all', ...Array.from(new Set(data.map(d => d.skill)))];

  // Filter data based on selections
  const filteredData = data.filter(d => 
    (selectedLocation === 'all' || d.location === selectedLocation) &&
    (selectedIndustry === 'all' || d.industry === selectedIndustry) &&
    (selectedSkill === 'all' || d.skill === selectedSkill)
  );

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          const width = container.clientWidth - 40;
          setDimensions({ width, height: 400 });
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
    const margin = { top: 20, right: 80, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Group data by skill
    const skillGroups = d3.group(filteredData, d => d.skill);
    const skillColors = d3.scaleOrdinal(d3.schemeCategory10);

    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(filteredData, d => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(filteredData, d => d.demand) || 100])
      .range([innerHeight, 0]);

    // Create line generator
    const line = d3.line<TrendData>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.demand))
      .curve(d3.curveMonotoneX);

    // Draw axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat((d) => d3.timeFormat("%b %Y")(d as Date));

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => `${d}%`);

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    g.append('g')
      .call(yAxis);

    // Add axis labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#64748b')
      .text('Demand Growth (%)');

    g.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#64748b')
      .text('Time Period');

    // Draw grid lines
    g.selectAll('.grid-line-y')
      .data(yScale.ticks())
      .enter()
      .append('line')
      .attr('class', 'grid-line-y')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#f1f5f9')
      .attr('stroke-width', 1);

    // Draw trend lines for each skill
    skillGroups.forEach((skillData, skill) => {
      const sortedData = skillData.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      g.append('path')
        .datum(sortedData)
        .attr('fill', 'none')
        .attr('stroke', skillColors(skill))
        .attr('stroke-width', 2)
        .attr('d', line);

      // Add data points
      g.selectAll(`.point-${skill.replace(/\s+/g, '-')}`)
        .data(sortedData)
        .enter()
        .append('circle')
        .attr('class', `point-${skill.replace(/\s+/g, '-')}`)
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.demand))
        .attr('r', 4)
        .attr('fill', skillColors(skill))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) {
          // Tooltip
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
            <strong>${d.skill}</strong><br/>
            Date: ${d.date.toLocaleDateString()}<br/>
            Demand: ${d.demand}%<br/>
            Growth: ${d.growth > 0 ? '+' : ''}${d.growth}%<br/>
            Location: ${d.location}<br/>
            Industry: ${d.industry}
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
      .attr('transform', `translate(${innerWidth + 10}, 20)`);

    const legendItems = Array.from(skillGroups.keys()).slice(0, 8); // Limit to 8 items

    legendItems.forEach((skill, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendItem.append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', skillColors(skill))
        .attr('stroke-width', 2);

      legendItem.append('text')
        .attr('x', 20)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('font-size', '11px')
        .style('fill', '#1e293b')
        .text(skill.length > 15 ? skill.substring(0, 15) + '...' : skill);
    });

  }, [filteredData, dimensions, isLoading]);

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

  // Calculate trend summary
  const latestData = filteredData.filter(d => {
    const latest = d3.max(filteredData, d => d.date);
    return d.date.getTime() === latest?.getTime();
  });

  const trendingUp = latestData.filter(d => d.growth > 5).length;
  const trendingDown = latestData.filter(d => d.growth < -5).length;
  const stable = latestData.filter(d => Math.abs(d.growth) <= 5).length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {trendingUp}
                </Badge>
                <Badge variant="secondary">
                  <Minus className="w-3 h-3 mr-1" />
                  {stable}
                </Badge>
                <Badge variant="destructive">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {trendingDown}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          <div className="flex flex-wrap gap-2">
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

            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map(industry => (
                  <SelectItem key={industry} value={industry}>
                    {industry === 'all' ? 'All Industries' : industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSkill} onValueChange={setSelectedSkill}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Skill" />
              </SelectTrigger>
              <SelectContent>
                {skills.map(skill => (
                  <SelectItem key={skill} value={skill}>
                    {skill === 'all' ? 'All Skills' : skill}
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

export default JobMarketTrendsChart;
