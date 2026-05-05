import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { LeadFormComponent } from './lead-form.component';
import { environment } from '../../../../environments/environment';

/**
 * CP15 smoke template: minimal "does it construct + does the form fire a POST"
 * test for the LeadFormComponent. Same pattern repeats for every CRUD form;
 * see tests/integration/Ulp.Integration.Tests/README.md for the post-beta plan
 * to extend this to every form.
 */
describe('LeadFormComponent', () => {
  let fixture: ComponentFixture<LeadFormComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeadFormComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeadFormComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('constructs without error', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('starts in create mode (no leadNumber locked) when route has no :id', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.isEdit()).toBeFalse();
    // leadNumber control is disabled only on edit; stays enabled here.
    expect(fixture.componentInstance.form.controls.leadNumber.disabled).toBeFalse();
  });

  it('POSTs CreateLeadRequest when valid form is submitted', async () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;

    c.form.patchValue({
      countryCode: 'IN',
      leadNumber:  'LEAD-TEST-1',
      source:      'Web',
      contactName: 'Smoke Test',
      companyName: 'Acme',
      email:       'smoke@test.local',
      phone:       null,
      industry:    null,
      estimatedVolume: null,
    });

    const submission = c.onSubmit();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/v1/sales/leads`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.leadNumber).toBe('LEAD-TEST-1');
    expect(req.request.body.contactName).toBe('Smoke Test');

    // Resolve the HTTP call so the component's saving signal flips back.
    req.flush({
      id: 1,
      tenantId: 1001,
      countryCode: 'IN',
      leadNumber: 'LEAD-TEST-1',
      source: 'Web',
      contactName: 'Smoke Test',
      companyName: 'Acme',
      email: 'smoke@test.local',
      phone: null,
      industry: null,
      estimatedVolume: null,
      stage: 'New',
      ownerUserId: null,
      convertedPartyId: null,
      createdAt: '2026-05-05T00:00:00Z',
      modifiedAt: '2026-05-05T00:00:00Z',
    });

    await submission;
    expect(c.saving()).toBeFalse();
    expect(c.apiError()).toBeNull();
  });
});
