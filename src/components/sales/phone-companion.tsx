import { useState } from 'react';
import { Link } from 'react-router';
import { laptopOs, markOsPhoneLinked, osPhoneLinked } from '@/lib/calling';
import { Button } from '@/components/ui/button';

/**
 * One-time free link between this laptop and the employee's phone.
 * Windows Phone Link and Mac Continuity place the cellular call. The CRM only hands over a tel: link.
 */
export function OsPhoneLinkCard({ basePath, onLinked }: { basePath: string; onLinked?: () => void }) {
  const os = laptopOs();
  const [done, setDone] = useState(osPhoneLinked);

  const confirm = () => {
    markOsPhoneLinked();
    setDone(true);
    onLinked?.();
  };

  if (done) {
    return <p className="mt-1 text-muted-foreground">This laptop is linked to your phone. Call uses that phone’s SIM.</p>;
  }

  return (
    <div className="mt-2 text-muted-foreground">
      <p>Link this laptop to your phone once. After that, Call dials from the laptop through your SIM. It is free and built into the computer.</p>
      {os === 'windows' && (
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Open Phone Link on this laptop. It pairs your Android phone over Bluetooth and Wi-Fi.</li>
          <li>On the phone, install Link to Windows and scan the QR code.</li>
          <li>Allow calls when the phone asks.</li>
          <li>In Windows Settings, set Phone Link as the app for phone links (TEL).</li>
        </ol>
      )}
      {os === 'mac' && (
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Sign the Mac and iPhone into the same Apple ID, on the same Wi-Fi.</li>
          <li>On the iPhone, open Settings, Phone, Calls on Other Devices, and turn on this Mac.</li>
        </ol>
      )}
      {os === 'other' && <p className="mt-2">On a phone, Call opens the dialer directly. On a computer, link the phone with the system’s phone app first.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {os === 'windows' && <Button size="sm" variant="outline" asChild><a href="ms-phone:">Open Phone Link</a></Button>}
        <Button size="sm" variant="outline" asChild><Link to={`${basePath}/phone`}>Link steps</Link></Button>
        <Button size="sm" onClick={confirm}>This laptop is linked</Button>
      </div>
    </div>
  );
}

export function SalesPhonePage() {
  const os = laptopOs();
  const [done, setDone] = useState(osPhoneLinked);

  const confirm = () => {
    markOsPhoneLinked();
    setDone(true);
  };

  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-card p-6">
      <h2 className="font-display text-lg font-semibold">Link your phone to this laptop</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This uses the free phone connection already in Windows or macOS. The CRM does not place a separate internet call, and it does not record audio.
        After linking, press Call on a lead and the laptop dials through your phone’s SIM.
      </p>
      {os === 'windows' && (
        <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm">
          <li>Open Phone Link. It comes with Windows.</li>
          <li>Choose Android, then scan the QR code with Link to Windows on your phone. Pairing uses Bluetooth and Wi-Fi.</li>
          <li>Allow Phone Link to make and manage calls.</li>
          <li>Open Windows Settings, Apps, Default apps, and choose Phone Link for TEL / phone number links.</li>
        </ol>
      )}
      {os === 'mac' && (
        <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm">
          <li>Use the same Apple ID on the Mac and the iPhone, and keep them on the same Wi-Fi.</li>
          <li>On the iPhone open Settings, then Phone, then Calls on Other Devices.</li>
          <li>Turn on calls for this Mac.</li>
        </ol>
      )}
      {os === 'other' && (
        <p className="mt-4 text-sm text-muted-foreground">Open a lead on the phone and press Call. The dialer uses your SIM, with the number already filled in.</p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {os === 'windows' && <Button variant="outline" asChild><a href="ms-phone:">Open Phone Link</a></Button>}
        <Button onClick={confirm} disabled={done}>{done ? 'Phone linked' : 'This laptop is linked'}</Button>
      </div>
    </div>
  );
}
