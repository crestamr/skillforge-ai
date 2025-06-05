'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingUp, BookOpen, Target } from 'lucide-react';

export interface SkillGap {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  marketDemand: number; // 0-100
  salaryImpact: number; // percentage increase
  timeToAcquire: number; // weeks
  priority: 'high' | 'medium' | 'low';
  category: string;
  learningResources: number;
  jobOpportunities: number;
}

interface SkillGapAnalysisChartProps {
  gaps: SkillGap[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
  onSkillSelect?: (skill: string) => void;
}

export const SkillGapAnalysisChart: React.FC<SkillGapAnalysisChartProps> = ({
  gaps,
  title = "Skill Gap Analysis",
  description = "Prioritized recommendations for skill development",
  isLoading = false,
  className = "",
  onSkillSelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Filter gaps by priority
  const filteredGaps = selectedPriority === 'all' ? 
    gaps : gaps.filter(g => g.priority === selectedPriority);

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
    if (!filteredGaps || filteredGaps.length === 0 || isLoading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const margin = { top: 40, right: 120, bottom: 80, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create bubble chart: x = market demand, y = salary impact, size = gap size
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(filteredGaps, d => d.salaryImpact) || 50])
      .range([innerHeight, 0]);

    const sizeScale = d3.scaleSqrt()
      .domain([0, d3.max(filteredGaps, d => d.requiredLevel - d.currentLevel) || 5])
      .range([10, 50]);

    const colorScale = d3.scaleOrdinal()
      .domain(['high', 'medium', 'low'])
      .range(['#ef4444', '#f59e0b', '#10b981']);

    // Draw axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => `${d}%`);

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => `+${d}%`);

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis);

    g.append('g')
      .call(yAxis);

    // Add axis labels
    g.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + 40})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', '#1e293b')
      .text('Market Demand (%)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 20)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', '#1e293b')
      .text('Salary Impact (%)');

    // Draw grid lines
    g.selectAll('.grid-line-x')
      .data(xScale.ticks())
      .enter()
      .append('line')
      .attr('class', 'grid-line-x')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#f1f5f9')
      .attr('stroke-width', 1);

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

    // Draw quadrant labels
    const quadrantLabels = [
      { x: innerWidth * 0.75, y: innerHeight * 0.25, text: 'High Impact\nHigh Demand', color: '#ef4444' },
      { x: innerWidth * 0.25, y: innerHeight * 0.25, text: 'High Impact\nLow Demand', color: '#f59e0b' },
      { x: innerWidth * 0.75, y: innerHeight * 0.75, text: 'Low Impact\nHigh Demand', color: '#3b82f6' },
      { x: innerWidth * 0.25, y: innerHeight * 0.75, text: 'Low Impact\nLow Demand', color: '#64748b' }
    ];

    quadrantLabels.forEach(label => {
      g.append('text')
        .attr('x', label.x)
        .attr('y', label.y)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', label.color)
        .style('opacity', 0.6)
        .selectAll('tspan')
        .data(label.text.split('\n'))
        .enter()
        .append('tspan')
        .attr('x', label.x)
        .attr('dy', (d, i) => i === 0 ? 0 : '1.2em')
        .text(d => d);
    });

    // Draw bubbles
    const bubbles = g.selectAll('.bubble')
      .data(filteredGaps)
      .enter()
      .append('g')
      .attr('class', 'bubble')
      .style('cursor', 'pointer');

    bubbles.append('circle')
      .attr('cx', d => xScale(d.marketDemand))
      .attr('cy', d => yScale(d.salaryImpact))
      .attr('r', d => sizeScale(d.requiredLevel - d.currentLevel))
      .attr('fill', d => colorScale(d.priority) as string)
      .attr('fill-opacity', 0.7)
      .attr('stroke', d => colorScale(d.priority) as string)
      .attr('stroke-width', 2)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('fill-opacity', 0.9)
          .attr('stroke-width', 3);

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

        tooltip.html(`
          <div style="font-weight: bold; margin-bottom: 8px; color: ${colorScale(d.priority)};">
            ${d.skill} (${d.priority.toUpperCase()} PRIORITY)
          </div>
          <div style="margin-bottom: 4px;">Gap: ${d.requiredLevel - d.currentLevel} levels</div>
          <div style="margin-bottom: 4px;">Market Demand: ${d.marketDemand}%</div>
          <div style="margin-bottom: 4px;">Salary Impact: +${d.salaryImpact}%</div>
          <div style="margin-bottom: 4px;">Time to Acquire: ${d.timeToAcquire} weeks</div>
          <div style="margin-bottom: 4px;">Learning Resources: ${d.learningResources}</div>
          <div style="margin-bottom: 4px;">Job Opportunities: ${d.jobOpportunities}</div>
          <div style="margin-top: 8px; font-style: italic;">
            Click to view learning path
          </div>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('fill-opacity', 0.7)
          .attr('stroke-width', 2);

        d3.selectAll('.tooltip').remove();
      })
      .on('click', function(event, d) {
        if (onSkillSelect) {
          onSkillSelect(d.skill);
        }
      });

    // Add skill labels
    bubbles.append('text')
      .attr('x', d => xScale(d.marketDemand))
      .attr('y', d => yScale(d.salaryImpact))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => d.skill.length > 8 ? d.skill.substring(0, 8) + '...' : d.skill);

    // Add priority indicators
    bubbles.append('circle')
      .attr('cx', d => xScale(d.marketDemand) + sizeScale(d.requiredLevel - d.currentLevel) * 0.6)
      .attr('cy', d => yScale(d.salaryImpact) - sizeScale(d.requiredLevel - d.currentLevel) * 0.6)
      .attr('r', 8)
      .attr('fill', 'white')
      .attr('stroke', d => colorScale(d.priority) as string)
      .attr('stroke-width', 2);

    bubbles.append('text')
      .attr('x', d => xScale(d.marketDemand) + sizeScale(d.requiredLevel - d.currentLevel) * 0.6)
      .attr('y', d => yScale(d.salaryImpact) - sizeScale(d.requiredLevel - d.currentLevel) * 0.6)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '8px')
      .style('font-weight', 'bold')
      .style('fill', d => colorScale(d.priority) as string)
      .style('pointer-events', 'none')
      .text(d => d.priority === 'high' ? '!' : d.priority === 'medium' ? '?' : '·');

    // Add legend
    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth + 20}, 20)`);

    const legendData = [
      { label: 'High Priority', color: '#ef4444', symbol: '!' },
      { label: 'Medium Priority', color: '#f59e0b', symbol: '?' },
      { label: 'Low Priority', color: '#10b981', symbol: '·' }
    ];

    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      legendItem.append('circle')
        .attr('r', 8)
        .attr('fill', item.color)
        .attr('fill-opacity', 0.7)
        .attr('stroke', item.color)
        .attr('stroke-width', 2);

      legendItem.append('text')
        .attr('x', 15)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('font-size', '11px')
        .style('fill', '#1e293b')
        .text(item.label);
    });

    // Add size legend
    const sizeLegend = legend.append('g')
      .attr('transform', 'translate(0, 100)');

    sizeLegend.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', '#1e293b')
      .text('Skill Gap Size:');

    const sizeData = [1, 3, 5];
    sizeData.forEach((gap, i) => {
      const sizeItem = sizeLegend.append('g')
        .attr('transform', `translate(${i * 30}, 20)`);

      sizeItem.append('circle')
        .attr('r', sizeScale(gap))
        .attr('fill', '#94a3b8')
        .attr('fill-opacity', 0.5)
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1);

      sizeItem.append('text')
        .attr('x', 0)
        .attr('y', sizeScale(5) + 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '9px')
        .style('fill', '#64748b')
        .text(`${gap} lvl`);
    });

  }, [filteredGaps, dimensions, isLoading]);

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
  const highPriority = gaps.filter(g => g.priority === 'high').length;
  const mediumPriority = gaps.filter(g => g.priority === 'medium').length;
  const lowPriority = gaps.filter(g => g.priority === 'low').length;
  const avgTimeToAcquire = Math.round(
    gaps.reduce((sum, g) => sum + g.timeToAcquire, 0) / gaps.length
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              <div className="flex gap-2">
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {highPriority} High
                </Badge>
                <Badge variant="secondary">
                  <Target className="w-3 h-3 mr-1" />
                  {mediumPriority} Medium
                </Badge>
                <Badge variant="outline">
                  {lowPriority} Low
                </Badge>
                <Badge variant="default">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {avgTimeToAcquire}w avg
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={selectedPriority === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPriority('all')}
            >
              All
            </Button>
            <Button
              variant={selectedPriority === 'high' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setSelectedPriority('high')}
            >
              High Priority
            </Button>
            <Button
              variant={selectedPriority === 'medium' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSelectedPriority('medium')}
            >
              Medium
            </Button>
            <Button
              variant={selectedPriority === 'low' ? 'outline' : 'outline'}
              size="sm"
              onClick={() => setSelectedPriority('low')}
            >
              Low
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <svg ref={svgRef} className="w-full h-auto" />
        </div>
        
        {highPriority > 0 && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Immediate Action Required:
            </h4>
            <div className="flex flex-wrap gap-2">
              {gaps.filter(g => g.priority === 'high').slice(0, 5).map((gap, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-red-700 border-red-300 cursor-pointer hover:bg-red-100"
                  onClick={() => onSkillSelect?.(gap.skill)}
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  {gap.skill} (+{gap.salaryImpact}%)
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SkillGapAnalysisChart;
