import { useState } from 'react'
import { Icon } from '@/components/icons'
import { ButtonAnchor, Input, Select } from '@/components/ui'
import type { CalculatorKind } from '@/content/serviceDetails'

interface ServiceCalculatorProps {
  kind: CalculatorKind
  serviceName: string
  onSend: (message: string) => void
}

function num(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function usd(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

/**
 * Indicative sizing helpers. The formulas are deliberately simple and the
 * output is labelled as indicative: they start a conversation, they do not
 * replace a measured load. The output is attached to the lead when sent.
 */
export function ServiceCalculator({ kind, serviceName, onSend }: ServiceCalculatorProps) {
  const [length, setLength] = useState('14')
  const [width, setWidth] = useState('12')
  const [sun, setSun] = useState('moderate')
  const [occupants, setOccupants] = useState('2')

  const [rooms, setRooms] = useState('4')
  const [roomArea, setRoomArea] = useState('180')
  const [diversity, setDiversity] = useState('85')

  const [floorArea, setFloorArea] = useState('5000')
  const [loadDensity, setLoadDensity] = useState('80')

  const [cfm, setCfm] = useState('1200')
  const [velocity, setVelocity] = useState('900')

  const [volume, setVolume] = useState('120')
  const [tempClass, setTempClass] = useState('-18')
  const [doors, setDoors] = useState('6')

  const [units, setUnits] = useState('6')
  const [plan, setPlan] = useState('comprehensive')

  let result = ''
  let detail = ''
  let summary = ''

  if (kind === 'tonnage') {
    const area = num(length) * num(width)
    const sunFactor = sun === 'west' ? 1.18 : sun === 'east' ? 1.08 : 1
    const btu = (area * 25 + num(occupants) * 600) * sunFactor
    const tr = Math.ceil((btu / 12000) * 2) / 2
    result = `${tr.toFixed(1)} TR`
    detail = `${Math.round(btu).toLocaleString('en-US')} BTU/h · ${area.toFixed(0)} sq ft`
    summary = `[Sizing helper] ${serviceName}: room ${length || 0} × ${width || 0} ft (${area.toFixed(0)} sq ft), ${sun} exposure, ${occupants || 0} occupants → indicative ${tr.toFixed(1)} TR (${Math.round(btu).toLocaleString('en-US')} BTU/h). Please verify on survey.`
  } else if (kind === 'vrf') {
    const connected = (num(rooms) * num(roomArea)) / 120
    const outdoor = connected * (num(diversity) / 100)
    result = `${outdoor.toFixed(1)} TR`
    detail = `Outdoor capacity · ${connected.toFixed(1)} TR connected at ${diversity || 0}% diversity`
    summary = `[Zone planner] ${serviceName}: ${rooms || 0} rooms at ${roomArea || 0} sq ft, ${diversity || 0}% diversity → indicative ${outdoor.toFixed(1)} TR outdoor (${connected.toFixed(1)} TR connected). Please verify room-by-room on survey.`
  } else if (kind === 'chiller') {
    const m2 = num(floorArea) * 0.0929
    const tr = (m2 * num(loadDensity)) / 3517
    result = `${tr.toFixed(0)} TR`
    detail = `${m2.toFixed(0)} m² at ${loadDensity || 0} W/m²`
    summary = `[Capacity estimator] ${serviceName}: ${floorArea || 0} sq ft (${m2.toFixed(0)} m²) at ${loadDensity || 0} W/m² → indicative ${tr.toFixed(0)} TR. Please verify with a measured load profile.`
  } else if (kind === 'duct') {
    const sqFt = num(cfm) / (num(velocity) || 1)
    const diameter = Math.sqrt((4 * sqFt) / Math.PI) * 12
    result = `${diameter.toFixed(0)} in Ø`
    detail = `${sqFt.toFixed(2)} sq ft at ${velocity || 0} fpm · ${cfm || 0} CFM`
    summary = `[Duct sizing helper] ${serviceName}: ${cfm || 0} CFM at ${velocity || 0} fpm → ${sqFt.toFixed(2)} sq ft, ${diameter.toFixed(0)} in diameter equivalent. Please confirm pressure class on survey.`
  } else if (kind === 'cold-room') {
    const factor = tempClass === '-18' ? 18 : tempClass === '0' ? 12 : 9
    const tr = (num(volume) * factor + num(doors) * 150) / 3517
    result = `${tr.toFixed(1)} TR`
    detail = `${volume || 0} m³ at ${tempClass} °C · ${doors || 0} door openings/day`
    summary = `[Cold room estimator] ${serviceName}: ${volume || 0} m³ at ${tempClass} °C, ${doors || 0} door openings/day → indicative ${tr.toFixed(1)} TR. Product load and pull-down must be verified.`
  } else {
    const perUnit = plan === 'essential' ? 480 : plan === 'comprehensive' ? 960 : 0
    const visits = plan === 'essential' ? 2 : plan === 'comprehensive' ? 4 : 12
    result = perUnit ? `$${usd(perUnit * num(units))}` : 'Quoted per TR'
    detail = perUnit
      ? `${units || 0} units × $${usd(perUnit)} · ${visits} visits/year`
      : `${units || 0} units · ${visits} visits/year · priced on installed TR`
    summary = `[AMC selector] ${serviceName}: ${units || 0} units on the ${plan} plan → indicative ${result} per year, ${visits} visits. Please confirm the asset register before quoting.`
  }

  return (
    <div className="marks border border-line bg-panel/60 p-6 md:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className="annot">Sizing helper · CV-CALC</span>
        <Icon name="gauge" size={16} className="text-cold" />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {kind === 'tonnage' ? (
          <>
            <Input
              label="Room length (ft)"
              type="number"
              inputMode="decimal"
              min="1"
              value={length}
              onChange={(event) => setLength(event.target.value)}
            />
            <Input
              label="Room width (ft)"
              type="number"
              inputMode="decimal"
              min="1"
              value={width}
              onChange={(event) => setWidth(event.target.value)}
            />
            <Select
              label="Main exposure"
              options={[
                { value: 'north', label: 'North / shaded' },
                { value: 'moderate', label: 'East or moderate' },
                { value: 'west', label: 'West · heavy glazing' },
              ]}
              value={sun}
              onChange={(event) => setSun(event.target.value)}
            />
            <Input
              label="Occupants"
              type="number"
              inputMode="numeric"
              min="0"
              value={occupants}
              onChange={(event) => setOccupants(event.target.value)}
            />
          </>
        ) : null}

        {kind === 'vrf' ? (
          <>
            <Input
              label="Rooms / zones"
              type="number"
              inputMode="numeric"
              min="1"
              value={rooms}
              onChange={(event) => setRooms(event.target.value)}
            />
            <Input
              label="Average room (sq ft)"
              type="number"
              inputMode="decimal"
              min="1"
              value={roomArea}
              onChange={(event) => setRoomArea(event.target.value)}
            />
            <Select
              label="Simultaneous use"
              options={[
                { value: '70', label: '70% · bedrooms at night' },
                { value: '85', label: '85% · typical home' },
                { value: '100', label: '100% · all zones at once' },
              ]}
              value={diversity}
              onChange={(event) => setDiversity(event.target.value)}
            />
          </>
        ) : null}

        {kind === 'chiller' ? (
          <>
            <Input
              label="Conditioned area (sq ft)"
              type="number"
              inputMode="decimal"
              min="1"
              value={floorArea}
              onChange={(event) => setFloorArea(event.target.value)}
            />
            <Select
              label="Internal load"
              options={[
                { value: '60', label: '60 W/m² · offices' },
                { value: '80', label: '80 W/m² · mixed use' },
                { value: '120', label: '120 W/m² · equipment / labs' },
              ]}
              value={loadDensity}
              onChange={(event) => setLoadDensity(event.target.value)}
            />
          </>
        ) : null}

        {kind === 'duct' ? (
          <>
            <Input
              label="Airflow (CFM)"
              type="number"
              inputMode="numeric"
              min="1"
              value={cfm}
              onChange={(event) => setCfm(event.target.value)}
            />
            <Select
              label="Main velocity"
              options={[
                { value: '700', label: '700 fpm · low noise' },
                { value: '900', label: '900 fpm · standard' },
                { value: '1200', label: '1,200 fpm · tight route' },
              ]}
              value={velocity}
              onChange={(event) => setVelocity(event.target.value)}
            />
          </>
        ) : null}

        {kind === 'cold-room' ? (
          <>
            <Input
              label="Chamber volume (m³)"
              type="number"
              inputMode="decimal"
              min="1"
              value={volume}
              onChange={(event) => setVolume(event.target.value)}
            />
            <Select
              label="Holding temperature"
              options={[
                { value: '4', label: '+4 °C · chiller' },
                { value: '0', label: '0 °C · cooler' },
                { value: '-18', label: '-18 °C · freezer' },
              ]}
              value={tempClass}
              onChange={(event) => setTempClass(event.target.value)}
            />
            <Input
              label="Door openings / day"
              type="number"
              inputMode="numeric"
              min="0"
              value={doors}
              onChange={(event) => setDoors(event.target.value)}
            />
          </>
        ) : null}

        {kind === 'amc' ? (
          <>
            <Input
              label="Indoor units"
              type="number"
              inputMode="numeric"
              min="1"
              value={units}
              onChange={(event) => setUnits(event.target.value)}
            />
            <Select
              label="Plan"
              options={[
                { value: 'essential', label: 'Essential · 2 visits' },
                { value: 'comprehensive', label: 'Comprehensive · 4 visits' },
                { value: 'precision', label: 'Precision · 12 visits' },
              ]}
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
            />
          </>
        ) : null}
      </div>

      <div
        aria-live="polite"
        className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4"
      >
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-faint">
            Indicative duty
          </span>
          <p className="t-num mt-1 text-h3 text-fg">{result}</p>
          <p className="mt-1 max-w-[36ch] text-[11px] leading-snug text-fg-dim">{detail}</p>
        </div>
        <ButtonAnchor
          href="#enquire"
          size="sm"
          icon="arrow-right"
          onClick={() => onSend(summary)}
        >
          Send these figures
        </ButtonAnchor>
      </div>

      <p className="mt-4 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
        Indicative only · verified against a measured load before quotation
      </p>
    </div>
  )
}
