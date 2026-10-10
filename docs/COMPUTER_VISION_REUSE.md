# Computer vision reuse for the Crop Explorer

Research and implementation proposal, **5 October 2026**. The first [Crop Explorer](CROP_EXPLORER_PRESTEP.md) can publish existing USDA crop maps and estimated field outlines. For a learned layer, start with **frozen Presto features and a small crop classifier**, then test **U-TAE/PaPs** if predicting field instances adds value. Use **SamGeo with SAM 2.1** for geometry experiments. These are reusable implementations and published artifacts, not models we have run or validated in Illinois.

The [source ledger](research/cv-reuse-sources.json) records inspected repository commits, model-card revisions, documented artifacts and licence evidence. Research checked primary documentation and artifact metadata; no checkpoint inference, dataset backfill, training or paid compute was performed. Published benchmark scores are not forecasts of Radar's local accuracy.

## Three separate capabilities

1. **Find the field:** existing estimated boundaries or instance segmentation supply a candidate geometry. A polygon does not establish ownership or a crop name.
2. **Name the crop:** classify a seasonal multispectral sequence within a field or pixel. Growth and harvest timing help distinguish crops that look similar in one RGB image. Self-supervised features still need suitable labels to produce named classes.
3. **Forecast yield:** aggregate available observations and evaluated crop probabilities into the shared Nixtla feature adapter. Image encoders remain upstream of StatsForecast/MLForecast.

The map displays RGB tiles; the classifier consumes reflectance, dates and masks. Do not use compressed display colors as a substitute for the model's spectral input. Preserve native resolution: Sentinel-2 visible/NIR bands are 10 m, several other bands are 20 m, and HLS is 30 m. A common processing grid does not increase the information content of coarser bands.

## Reuse shortlist

| Candidate and primary implementation | What already exists | Proposed use and practical limit |
| --- | --- | --- |
| [NASA Harvest Presto](https://github.com/nasaharvest/presto), [WorldCereal classification](https://github.com/WorldCereal/worldcereal-classification) and [PromethEO](https://github.com/WorldCereal/prometheo) | Lightweight pretrained time-series encoder; original checkpoint included in the Presto repository; crop-mapping pipeline and typed modality adapters | **First learned experiment.** Freeze the encoder and fit a small regularized head. Check band normalization, dates, coordinates and missing-modality masks. Begin with the original checkpoint and its matching loader. WorldCereal currently pins PromethEO `v0.1.6`; its seasonal model bundle is a separate artifact. Verify checkpoint compatibility and terms before using that variant. |
| [U-TAE + PaPs](https://github.com/VSainteuf/utae-paps) with [PASTIS/PASTIS-R](https://github.com/VSainteuf/pastis-benchmark) | Crop-specific temporal semantic segmentation and parcel instance segmentation; public trained weights and parcel-labelled benchmark | **Best direct field-and-crop reference.** Reproduce a small official test subset before adapting it. French crop classes/calendar and training geography require local transfer evaluation. Use the corrected panoptic metrics; the repository documents an earlier metrics bug. |
| [SamGeo](https://github.com/opengeos/segment-geospatial) with [SAM 2.1](https://github.com/facebookresearch/sam2) | Georeferenced raster segmentation and mask-to-vector tooling; public generic segmentation checkpoints | **Optional geometry proposal/refinement.** Compare with existing boundaries before adding a model. A mask cannot reliably name maize or wheat. Shadows, roads, touching fields and tile seams need explicit inspection. Pin SAM 2.1; newer SAM versions need their own artifact audit. |
| [AlphaEarth annual embeddings](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_SATELLITE_EMBEDDING_V1_ANNUAL) | Public 10 m, 64-dimensional annual vectors | **Completed-year similarity/classification comparator.** Fit the same small head and sampling protocol as Presto. Full-calendar-year vectors cannot support an earlier issue date. The catalog lists CDL among training targets, so this is not an independent test against CDL or purely self-supervised crop discovery. |
| [Prithvi EO 1.0 crop model](https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-1.0-100M-multi-temporal-crop-classification), [Prithvi EO 2.0](https://github.com/NASA-IMPACT/Prithvi-EO-2.0), [TerraTorch](https://github.com/torchgeo/terratorch) | An already fine-tuned 13-class crop checkpoint; newer pretrained backbones and a crop fine-tuning example | **Later GPU comparison.** The ready crop head takes three dates × six HLS bands at 30 m. EO 2.0's foundation checkpoint needs a crop head; it is not the same ready classifier. CDL-derived training labels and full-season scene selection constrain independent and early-season claims. |
| [TorchGeo](https://github.com/torchgeo/torchgeo) | Geospatial datasets, spatial samplers and pretrained multispectral models | **Borrow input/sampling glue where it fits.** Keep CRS, resolution, band ordering and split boundaries explicit. Each wrapped dataset and weight has its own terms; the library licence does not cover them all. |
| [OlmoEarth v1.2](https://huggingface.co/allenai/OlmoEarth-v1_2-Base) through PromethEO | Another pretrained encoder; current optional adapter | **Watchlist.** Audit the custom OlmoEarth Artifact License and input mapping before selection. PromethEO's adapter requires Sentinel-2 and timestamps and returns a patch-token grid; that grid is not a native field polygon or 10 m crop raster. |

For the first Presto run, use multi-date Sentinel-2 surface reflectance and explicit cloud/missingness masks, with optional Sentinel-1 after a separate normalization check. The original encoder supports masked modalities and 1–24 timesteps. Run its paired input constructor and loader before translating to PromethEO's `Predictors` interface. Do not silently ignore missing weight keys or treat a WorldCereal crop-specific bundle as the original self-supervised checkpoint. Record whether each experiment uses a frozen encoder, trained head or fine-tuned backbone.

WorldCereal's complete cloud pipeline uses openEO/CDSE; its examples need backend access and potentially credits. Its local encoder, preprocessing and head patterns can be reused without making that service a prerequisite for the explorer. Presto's original data-generation examples also assume Google cloud services; use our own bounded source adapter rather than copying those platform requirements.

## What the solar-panel projects contribute

Solar mapping offers reusable **imagery-to-map processing patterns**. The crop task changes the target, temporal inputs and validation.

| Primary project | Useful pattern | Boundary on reuse |
| --- | --- | --- |
| [Global solar PV inventory](https://github.com/Lkruitwagen/solar-pv-global-inventory) | Sentinel-2/other imagery search, segmentation, temporal false-positive filtering, polygon outputs and human verification | Particularly relevant to mapping large objects. Its complete implementation requires Descartes Labs, Airbus SPOT access and a commercial solver. Borrow the stages, not the entire platform or solar-trained weights. |
| [DeepSolar](https://github.com/wangzhecheng/DeepSolar) and [DeepSolar for Germany](https://github.com/kdmayer/PV_Pipeline) | Tiled discovery, resumable work lists, separating object-containing tiles from location extraction | Rooftop workflows use much finer imagery; the German project documents 5–10 cm imagery. Sentinel-2 at 10 m cannot reproduce rooftop-panel detail. The older implementations also require dependency modernization. |
| [DeepSolar-3M](https://github.com/rajanieprabha/DeepSolar-3M) | More recent detection/segmentation examples and nationwide output aggregation | Useful implementation reference. Public code and dataset terms do not establish separately linked checkpoint or input-imagery rights. Its solar class is not a crop classifier. |

Implement overlap-aware windows with stable IDs, restartable jobs, valid-pixel masks, native CRS tracking, border reconciliation and geometry deduplication. Keep detection confidence, crop probability, mixed-field state and no-data separate. Compare raster predictions before and after vectorization, inspect false positives and a stratified sample of accepted results, then publish immutable map layers with provenance. These are proposed engineering patterns informed by the projects, not claims that every project implements every stage.

For agriculture, prefer a **multi-date crop encoder plus an optional instance module** over adapting a rooftop detector. Existing USDA field-like boundaries already supply a useful map interaction while learned boundary quality is being assessed.

## Labels and evaluation we can borrow

- **PASTIS** supplies crop and parcel-instance labels with published spatial folds. Use it to verify the U-TAE/PaPs implementation and input pipeline. Its geography and vintage do not demonstrate across-season performance in Illinois. Match each pretrained fold's training exclusions to the scored fold. The original archive is about 28.8 GB; PASTIS-R is larger. Choose an audited subset/access method before bulk retrieval.
- **NASA/IBM's [multi-temporal crop dataset](https://huggingface.co/datasets/ibm-nasa-geospatial/multi-temporal-crop-classification)** pairs 2022 CONUS HLS chips with 13 grouped CDL classes. It is useful for compatibility and a reproducible Prithvi baseline. Its targets are derived from a crop map, so it cannot independently establish crop accuracy. Its early/middle/late scene selection also uses the completed season.
- **[WorldCereal Reference Data Module](https://worldcereal.github.io/worldcereal-documentation/rdm/explore.html)** is a candidate source of in-situ crop observations. Public entries are discoverable without authentication, but dataset licences, years, coverage and label origins vary. Audit actual Illinois/nearby observations and pretrained-model overlap before committing to it as the test set.
- **USDA CDL** is useful for the first public layer, weak training labels and agreement diagnostics. **Crop Sequence Boundaries** are an estimated geometry source. Neither becomes independent ground truth by splitting its pixels or polygons into train and test sets.

Hold out whole fields, contiguous spatial blocks and separate seasons; set spatial buffers from the imagery receptive field and measured dependence before final scoring. Multiple pixels from one field do not create independent examples. Record pretraining geography/date and any label overlap. If the encoder was released after a historical issue, label that study retrospective; do not represent it as a contemporaneously available forecast model.

Version an explicit class crosswalk for CDL, PASTIS, WorldCereal and the Prithvi crop head. Score only compatible classes and report merged/excluded classes. A generic corn class does not establish grain rather than silage, and a broad wheat class does not establish a wheat subtype. Keep these definitions visible when connecting classification to a yield target.

Report per-class precision/recall, macro F1, confusion, calibration and coverage after abstention. Show small/mixed fields and cloudy areas separately. Report area-weighted agreement with CDL as a distinct diagnostic. Independent crop labels and compatible independent area totals remain required for the existing [classification release gate](SATELLITE_PHASE_PLAN.md#evaluation-and-release-gates); label scarcity may keep learned outputs private while the public provider layer ships.

## Bounded experiment order

Use the same proposed 2024, 10–20 km Champaign pilot as the explorer. The $100 experiment cap remains within the satellite plan's overall budget; it is a proposed spending limit, not provisioned infrastructure. Record download, storage, CPU/GPU time and egress, and stop before exceeding it. No new always-on inference service is needed.

| Experiment | Inputs and comparison | Completion evidence / next decision |
| --- | --- | --- |
| CV-00: artifact and input audit | Source inventory here, matching loaders/configs, model/data licences, pilot imagery and candidate independent labels | Metadata audit completed by this research; runtime compatibility and local label coverage still pending. Pin exact revisions and SHA-256 of downloaded weights; retain provider checksums separately. |
| CV-01: small Presto smoke run | At most 1,000 sampled field/pixel sequences, one completed year, matching original checkpoint; target at most two CPU-hours before reassessing | Deterministic finite embeddings, masked-data behavior, correct time/band/coordinate ordering and measured resource use. A failed compatibility check stops this variant; do not hide it with permissive loading. |
| CV-02: crop-head comparison | Seasonal spectral/index summaries + random forest baseline; frozen Presto + small head; AlphaEarth + the same head if access is practical | Identical grouped sampling, training budgets and untouched validation/test partitions. Extend to another audited season and independent test labels before release. Fit calibration on validation only. Apply frozen per-class acceptance/abstention rules; retain the simpler model if added complexity brings no measured gain. |
| CV-03: field-instance comparison | Existing boundary layer first; a small PASTIS U-TAE/PaPs inference subset; optionally SamGeo/SAM 2.1 on the local pilot | Corrected panoptic metrics on the official benchmark; local boundary/instance quality against an independently reviewed outline sample. Report IoU/boundary tolerance in metres, splits/merges, small-field failures and tile-seam duplicates. Treat CSB agreement separately from true boundary accuracy. |
| CV-04: conditional Prithvi comparison | Existing EO 1.0 crop checkpoint on compatible three-date HLS chips; EO 2.0/TerraTorch only if a new backbone comparison is justified | Input and runtime compatibility, same eligible crops/splits, accuracy and cost per mapped area. Skip if the simpler stack meets the product's needs. Further GPU work must fit the remaining proposed experiment budget. |

CV-01 checks execution, not crop accuracy. CV-02 needs more than one year and an independent test set before a learned layer can pass the release gate. CV-03 is optional for launch because existing field-like outlines already work. Freeze class mappings, tuning limits and final test partitions before model selection; leave missing or unsupported classes unavailable rather than guessing crop names.

## Fit with the sister projects

Keep the CV source adapters, training, weights, feature extraction and evaluation in private `agriculture-forecast`. A model-neutral input manifest should record source item/version, band order/units, native/processing grid, acquisition window, cloud treatment, missingness, checkpoint revision, label lineage and derivation time. Thin adapters can produce Presto tensors, PromethEO predictors or TerraTorch batches without changing the public map contract.

Publish approved observations or crop estimates as immutable tiles/field summaries with the [observation-layer manifest](CROP_EXPLORER_PRESTEP.md#serving-architecture); include model version and evaluation scope for a learned layer. `agriculture-viz` consumes them through the existing Radar brand and Vercel Git deployment. It does not train or load geospatial models in a Vercel request.

For later yield work, supply summaries in the shared `unique_id, ds, feature, value, available_at, known_future` shape, with `known_future=false`. Availability includes model/encoder release, source observations, masks, labels and completed derivation. Generate classifier-derived training features out of fold. Keep any completed-year embeddings or end-of-season crop maps out of earlier operational issues. Inflation and agriculture continue to share Nixtla contracts and forecasting machinery; agriculture adds an upstream imagery adapter.

## Licence and artifact decisions

| Component | Verified terms and selection implication |
| --- | --- |
| Presto, WorldCereal, PromethEO | MIT repository code. Original Presto checkpoint is bundled in its repository; no separate weight model card was found in this audit. Verify artifact terms before redistribution and separately audit WorldCereal's seasonal bundle. |
| U-TAE/PaPs and PASTIS | MIT code; official Zenodo PASTIS dataset and both trained-weight records specify CC BY 4.0. Retain dataset/model attribution separately from the code notice. |
| SamGeo and SAM 2.1 | MIT wrapper; SAM 2 explicitly covers code and checkpoints under Apache 2.0. Other wrapped segmentation models need their own review. |
| Prithvi and TerraTorch | EO 2.0 example code is MIT; inspected HF EO 2.0 foundation and EO 1.0 crop-model cards specify Apache 2.0. Crop benchmark dataset is CC BY 4.0. TerraTorch is Apache 2.0 with identified MIT files. |
| AlphaEarth | Catalog specifies CC BY 4.0 and required Google/Google DeepMind attribution. Public vectors do not imply unrestricted free hosted compute. |
| TorchGeo / OlmoEarth | TorchGeo library is MIT; wrapped resources vary. OlmoEarth's inspected card specifies its custom Artifact License, so keep it out of the default stack until those terms are audited. |
| Solar references | DeepSolar, German PV pipeline and global PV inventory code are MIT. DeepSolar-3M code is Apache 2.0 and its dataset is CC BY 4.0. Input imagery and separately hosted weights require their own checks. |

These are inspected declarations, not a claim that all downstream imagery, annotations or artifacts inherit a repository's licence. Keep pinned artifact metadata in the private run manifest when implementation begins. The public ledger records provider MD5 values and Git blob identities as such; it does not invent SHA-256 digests or imply that downloaded checkpoints have been verified or run.
