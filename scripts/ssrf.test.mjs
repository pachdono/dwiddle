import test from "node:test";
import assert from "node:assert/strict";
import { privateAddress, safeUrl } from "../api/browse.js";

test("every internal form of an address is refused", () => {
  const internal = ["127.0.0.1", "10.1.2.3", "192.168.1.1", "169.254.169.254", "172.16.0.1", "100.64.0.1", "0.0.0.0", "224.0.0.1",
    "::1", "::", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1", "fc00::1", "fd12::1", "fe80::1", "fe90::1", "febf::1", "fec0::1", "ff02::1",
    "64:ff9b::7f00:1", "2002:7f00:1::1"];
  for (const ip of internal) assert.ok(privateAddress(ip), ip + " should be refused");
});

test("public addresses are allowed", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111", "2001:4860:4860::8888"]) assert.ok(!privateAddress(ip), ip + " should be allowed");
});

test("addresses written as URLs cannot reach internal hosts", async () => {
  for (const u of ["http://127.0.0.1/", "http://[::ffff:127.0.0.1]/", "http://[::1]/", "http://169.254.169.254/latest/meta-data/", "http://localhost/", "http://user:pw@8.8.8.8/", "http://8.8.8.8:8080/", "ftp://8.8.8.8/", "http://[fe90::1]/"])
    assert.equal(await safeUrl(u), null, u);
  assert.ok(await safeUrl("https://8.8.8.8/"));
});
