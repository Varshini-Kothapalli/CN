import React from 'react';
import { Info } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="disclaimer-banner no-print">
      <Info size={20} color="#38bdf8" style={{ flexShrink: 0 }} />
      <div>
        <strong>Notice: </strong>
        Diagnostic results are collected manually from Cisco Packet Tracer. This application analyzes the supplied evidence using an offline rule-driven engine and does not directly monitor Packet Tracer.
      </div>
    </div>
  );
}
